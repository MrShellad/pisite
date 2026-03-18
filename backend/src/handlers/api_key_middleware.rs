use std::{
    collections::HashMap,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use once_cell::sync::Lazy;
use sqlx::SqlitePool;

static RATE_LIMITER: Lazy<Mutex<HashMap<(String, u64), u32>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn match_template(template: &str, path: &str) -> bool {
    if template == path {
        return true;
    }
    let t_parts: Vec<&str> = template.trim_matches('/').split('/').collect();
    let p_parts: Vec<&str> = path.trim_matches('/').split('/').collect();
    if t_parts.len() != p_parts.len() {
        return false;
    }
    for (t, p) in t_parts.iter().zip(p_parts.iter()) {
        if t.starts_with('{') && t.ends_with('}') {
            continue;
        }
        if t != p {
            return false;
        }
    }
    true
}

async fn get_policy(
    pool: &SqlitePool,
    method: &str,
    path: &str,
) -> Option<(bool, bool)> {
    // returns (public_enabled, require_api_key)
    let rows: Vec<(String, i64, i64)> = sqlx::query_as(
        "SELECT path_template, public_enabled, require_api_key
         FROM api_endpoint_policies
         WHERE method = ? AND group_name = 'public'",
    )
    .bind(method)
    .fetch_all(pool)
    .await
    .ok()?;

    // 选择“最具体”的模板：长度更长优先
    let mut best: Option<(usize, bool, bool)> = None;
    for (tpl, pub_en, req_key) in rows {
        if match_template(&tpl, path) {
            let score = tpl.len();
            let pub_en = pub_en != 0;
            let req_key = req_key != 0;
            if best.map(|b| score > b.0).unwrap_or(true) {
                best = Some((score, pub_en, req_key));
            }
        }
    }
    best.map(|(_, a, b)| (a, b))
}

fn now_unix_minute() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        / 60
}

fn client_ip_from_req<B>(req: &Request<B>) -> Option<String> {
    if let Some(ip) = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
    {
        return Some(ip.to_string());
    }
    req.extensions()
        .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
        .map(|ci| ci.0.ip().to_string())
}

pub async fn api_key_middleware(
    State(pool): State<SqlitePool>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = req.uri().path().to_string();

    // 只处理 /api；但排除 /api/admin 和 /api/auth
    if !path.starts_with("/api/") || path.starts_with("/api/admin") || path.starts_with("/api/auth") {
        return Ok(next.run(req).await);
    }

    let method = req.method().to_string();

    // 默认策略：允许公网访问 & 不强制 API Key
    let (public_enabled, require_api_key) =
        get_policy(&pool, &method, &path).await.unwrap_or((true, false));

    if !public_enabled {
        // 对公网禁用时直接 404（隐藏接口）
        let resp = Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("Not Found"))
            .unwrap();
        return Ok(resp);
    }

    // 读取 API Key（可选；当 require_api_key=true 时变为必填）
    let key_str = req
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if require_api_key && key_str.is_none() {
        let resp = Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body(Body::from("Missing X-API-Key"))
            .unwrap();
        return Ok(resp);
    }

    // 不强制 key 且未提供 key：直接放行，但仍然记录访问日志（key_id 为空）
    if key_str.is_none() {
        let ip = client_ip_from_req(&req);
        let response = next.run(req).await;
        let status = response.status().as_u16() as i32;
        let _ = sqlx::query(
            "INSERT INTO api_access_logs (key_id, path, method, status, ip) VALUES (NULL, ?, ?, ?, ?)",
        )
        .bind(&path)
        .bind(&method)
        .bind(status)
        .bind(ip)
        .execute(&pool)
        .await;
        return Ok(response);
    }
    let key_str = key_str.unwrap();

    // 查询 API Key
    let row: Option<(String, Option<String>, i32)> = sqlx::query_as::<_, (String, Option<String>, i32)>(
        "SELECT id, scopes, rate_limit_per_minute FROM api_keys WHERE key = ? AND is_active = 1",
    )
    .bind(&key_str)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let Some((key_id, scopes, rate_limit)) = row else {
        let resp = Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body(Body::from("Invalid or disabled API key"))
            .unwrap();
        return Ok(resp);
    };

    // scopes 权限检查仅在“强制 key”时启用；否则 key 只是用于限流/日志
    if require_api_key {
        if let Some(scopes_str) = scopes {
            let allowed: bool = scopes_str
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .any(|prefix| path.starts_with(prefix));
            if !allowed {
                let resp = Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .body(Body::from("API key has no permission for this path"))
                    .unwrap();
                return Ok(resp);
            }
        }
    }

    // 限流：基于 (key_id, 当前分钟)
    if rate_limit > 0 {
        let bucket = now_unix_minute();
        let mut guard: std::sync::MutexGuard<'_, HashMap<(String, u64), u32>> = RATE_LIMITER.lock().unwrap();
        let counter = guard.entry((key_id.clone(), bucket)).or_insert(0u32);
        if *counter >= rate_limit as u32 {
            let resp = Response::builder()
                .status(StatusCode::TOO_MANY_REQUESTS)
                .body(Body::from("Rate limit exceeded"))
                .unwrap();
            return Ok(resp);
        }
        *counter += 1;
    }

    // 更新 last_used_at（尽力而为）
    let _ = sqlx::query("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&key_id)
        .execute(&pool)
        .await;

    // 记录访问日志（请求通过与否都记）
    let ip = client_ip_from_req(&req);

    let response = next.run(req).await;
    let status = response.status().as_u16() as i32;

    let _ = sqlx::query(
        "INSERT INTO api_access_logs (key_id, path, method, status, ip) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&key_id)
    .bind(&path)
    .bind(&method)
    .bind(status)
    .bind(ip)
    .execute(&pool)
    .await;

    Ok(response)
}


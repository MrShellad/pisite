use axum::{Json, extract::State, http::StatusCode};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

use crate::auth::JWT_SECRET;
use crate::donor_support::normalize_mc_uuid;
use crate::models::{DonorClientAuthResponse, DonorClientLoginPayload, DonorClientMeResponse};

#[derive(serde::Serialize, serde::Deserialize)]
struct ClientClaims {
    sub: String, // activation_id
    exp: usize,
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn plus_days(days: u64) -> u64 {
    now_unix() + days * 24 * 3600
}

fn unix_to_sqlite_datetime(unix: u64) -> String {
    // SQLite DATETIME: use unixepoch conversion in queries when needed;
    // here we store RFC3339-ish string via chrono would be nicer, but project doesn't use chrono.
    // We'll store as unix seconds string to stay consistent and simple.
    unix.to_string()
}

async fn get_active_license(
    pool: &SqlitePool,
    user_id: &str,
) -> Result<(String, bool, String), (StatusCode, String)> {
    // returns (tier, is_beta_enabled, status)
    let row: Option<(String, i64, String)> = sqlx::query_as(
        "SELECT tier, is_beta_enabled, status FROM licenses WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1"
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some((tier, is_beta_enabled, status)) = row else {
        return Err((
            StatusCode::FORBIDDEN,
            "该用户未配置授权 License".to_string(),
        ));
    };
    Ok((tier, is_beta_enabled != 0, status))
}

pub async fn login(
    State(pool): State<SqlitePool>,
    Json(payload): Json<DonorClientLoginPayload>,
) -> Result<Json<DonorClientAuthResponse>, (StatusCode, String)> {
    let mc_uuid = normalize_mc_uuid(&payload.mc_uuid).map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    // 1) 找到用户
    let user: Option<(String,)> = sqlx::query_as("SELECT id FROM users WHERE mc_uuid = ?")
        .bind(&mc_uuid)
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some((user_id,)) = user else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "未找到该 MC UUID 的捐赠用户".to_string(),
        ));
    };

    // 2) 校验 license
    let (tier, is_beta_enabled, status) = get_active_license(&pool, &user_id).await?;
    if status != "active" {
        return Err((StatusCode::FORBIDDEN, format!("授权状态不可用: {}", status)));
    }

    // 3) upsert device
    let device_id = {
        let existing: Option<(String,)> =
            sqlx::query_as("SELECT id FROM devices WHERE user_id = ? AND device_uuid = ?")
                .bind(&user_id)
                .bind(&payload.device_uuid)
                .fetch_optional(&pool)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let now = unix_to_sqlite_datetime(now_unix());
        if let Some((id,)) = existing {
            sqlx::query(
                "UPDATE devices SET device_name = ?, last_seen_at = ?, is_active = 1 WHERE id = ?",
            )
            .bind(&payload.device_name)
            .bind(&now)
            .bind(&id)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            id
        } else {
            let id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO devices (id, user_id, device_uuid, device_name, last_seen_at, is_active) VALUES (?, ?, ?, ?, ?, 1)"
            )
            .bind(&id)
            .bind(&user_id)
            .bind(&payload.device_uuid)
            .bind(&payload.device_name)
            .bind(&now)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            id
        }
    };

    // 4) 创建 activation（同设备只保留 1 条激活）
    sqlx::query("DELETE FROM activations WHERE device_id = ?")
        .bind(&device_id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let activation_id = Uuid::new_v4().to_string();
    let issued = now_unix();
    let expires = plus_days(7);
    let issued_at = unix_to_sqlite_datetime(issued);
    let expires_at = unix_to_sqlite_datetime(expires);

    sqlx::query(
        "INSERT INTO activations (id, user_id, device_id, issued_at, expires_at, last_refresh_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&activation_id)
    .bind(&user_id)
    .bind(&device_id)
    .bind(&issued_at)
    .bind(&expires_at)
    .bind(&issued_at)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let claims = ClientClaims {
        sub: activation_id,
        exp: expires as usize,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(DonorClientAuthResponse {
        token,
        expires_at,
        tier,
        is_beta_enabled,
        status,
    }))
}

fn decode_activation_id(auth_header: Option<&str>) -> Result<String, (StatusCode, String)> {
    let Some(auth_header) = auth_header else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "缺少 Authorization 标头".to_string(),
        ));
    };
    if !auth_header.starts_with("Bearer ") {
        return Err((StatusCode::UNAUTHORIZED, "Token 格式错误".to_string()));
    }
    let token = &auth_header[7..];
    let token_data = decode::<ClientClaims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Token 无效或已过期".to_string()))?;
    Ok(token_data.claims.sub)
}

pub async fn me(
    State(pool): State<SqlitePool>,
    headers: axum::http::HeaderMap,
) -> Result<Json<DonorClientMeResponse>, (StatusCode, String)> {
    let activation_id =
        decode_activation_id(headers.get("Authorization").and_then(|v| v.to_str().ok()))?;
    let row: Option<(String, String, String, i64, String)> = sqlx::query_as(
        "SELECT a.user_id, a.expires_at, l.tier, l.is_beta_enabled, l.status
         FROM activations a
         JOIN licenses l ON l.user_id = a.user_id
         WHERE a.id = ?
         ORDER BY l.updated_at DESC
         LIMIT 1",
    )
    .bind(&activation_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some((_user_id, expires_at, tier, is_beta_enabled, status)) = row else {
        return Err((StatusCode::UNAUTHORIZED, "激活不存在或已失效".to_string()));
    };

    Ok(Json(DonorClientMeResponse {
        expires_at,
        tier,
        is_beta_enabled: is_beta_enabled != 0,
        status,
    }))
}

pub async fn refresh(
    State(pool): State<SqlitePool>,
    headers: axum::http::HeaderMap,
) -> Result<Json<DonorClientAuthResponse>, (StatusCode, String)> {
    let activation_id =
        decode_activation_id(headers.get("Authorization").and_then(|v| v.to_str().ok()))?;

    let activation: Option<(String, String)> =
        sqlx::query_as("SELECT user_id, device_id FROM activations WHERE id = ?")
            .bind(&activation_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some((user_id, device_id)) = activation else {
        return Err((StatusCode::UNAUTHORIZED, "激活不存在或已失效".to_string()));
    };

    // license 仍然必须 active
    let (tier, is_beta_enabled, status) = get_active_license(&pool, &user_id).await?;
    if status != "active" {
        return Err((StatusCode::FORBIDDEN, format!("授权状态不可用: {}", status)));
    }

    // device 必须 active
    let device_active: Option<(i64,)> =
        sqlx::query_as("SELECT is_active FROM devices WHERE id = ?")
            .bind(&device_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if device_active.map(|d| d.0).unwrap_or(0) == 0 {
        return Err((StatusCode::FORBIDDEN, "设备已被禁用".to_string()));
    }

    let new_expires = plus_days(7);
    let now = unix_to_sqlite_datetime(now_unix());
    let expires_at = unix_to_sqlite_datetime(new_expires);

    sqlx::query("UPDATE activations SET expires_at = ?, last_refresh_at = ? WHERE id = ?")
        .bind(&expires_at)
        .bind(&now)
        .bind(&activation_id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let claims = ClientClaims {
        sub: activation_id,
        exp: new_expires as usize,
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(DonorClientAuthResponse {
        token,
        expires_at,
        tier,
        is_beta_enabled,
        status,
    }))
}

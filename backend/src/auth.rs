// backend/src/auth.rs
use crate::models::Claims;
use axum::{
    body::Body,
    extract::FromRequestParts,
    http::{Method, Request, StatusCode, request::Parts},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{DecodingKey, Validation, decode};
use once_cell::sync::Lazy;
use std::env;
use uuid::Uuid;

pub const ADMIN_ROLE: &str = "admin";
pub const DONOR_ROLE: &str = "donor";

// 使用 Lazy 确保它只在程序第一次访问时生成一次，并且在整个容器运行期间保持不变
pub static JWT_SECRET: Lazy<String> = Lazy::new(|| {
    // 优先尝试从环境变量读取，如果没配，就随机生成一个 UUID 字符串作为秘钥！
    env::var("JWT_SECRET").unwrap_or_else(|_| {
        let random_key = Uuid::new_v4().to_string();
        println!("⚠️ 警告: 未检测到 JWT_SECRET 环境变量，本次运行已随机生成临时秘钥！");
        random_key
    })
});

pub static DONOR_JWT_SECRET: Lazy<String> = Lazy::new(|| {
    env::var("DONOR_JWT_SECRET").unwrap_or_else(|_| format!("donor:{}", JWT_SECRET.as_str()))
});

fn bearer_token(auth_header: Option<&str>) -> Result<&str, (StatusCode, String)> {
    let Some(auth_header) = auth_header else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "缺少 Authorization 标头".to_string(),
        ));
    };

    auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Token 格式错误".to_string()))
}

fn decode_admin_claims_from_token(token: &str) -> Result<Claims, (StatusCode, String)> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Token 无效或已过期".to_string()))?;

    if token_data.claims.role != ADMIN_ROLE {
        return Err((StatusCode::FORBIDDEN, "管理员权限不足".to_string()));
    }

    Ok(token_data.claims)
}

fn decode_admin_claims_from_header(
    auth_header: Option<&str>,
) -> Result<Claims, (StatusCode, String)> {
    decode_admin_claims_from_token(bearer_token(auth_header)?)
}

pub async fn admin_auth_middleware(
    req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    let path = req.uri().path();
    if !path.starts_with("/api/admin") || req.method() == Method::OPTIONS {
        return Ok(next.run(req).await);
    }

    decode_admin_claims_from_header(
        req.headers()
            .get("Authorization")
            .and_then(|value| value.to_str().ok()),
    )?;

    Ok(next.run(req).await)
}

// 为 Claims 实现 FromRequestParts
// 只要你的 API 处理函数里写了 `claims: Claims` 这个参数，Axum 就会自动先执行这段代码
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    // 原生 async fn，去掉了旧版的 #[async_trait]
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        decode_admin_claims_from_header(
            parts
                .headers
                .get("Authorization")
                .and_then(|value| value.to_str().ok()),
        )
    }
}
// 注意：不要在这里写 create_router，它应该在 routes.rs 中！

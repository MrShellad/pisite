// backend/src/auth.rs
use crate::models::Claims;
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use jsonwebtoken::{DecodingKey, Validation, decode};
use once_cell::sync::Lazy;
use std::env;
use uuid::Uuid;

// 使用 Lazy 确保它只在程序第一次访问时生成一次，并且在整个容器运行期间保持不变
pub static JWT_SECRET: Lazy<String> = Lazy::new(|| {
    // 优先尝试从环境变量读取，如果没配，就随机生成一个 UUID 字符串作为秘钥！
    env::var("JWT_SECRET").unwrap_or_else(|_| {
        let random_key = Uuid::new_v4().to_string();
        println!("⚠️ 警告: 未检测到 JWT_SECRET 环境变量，本次运行已随机生成临时秘钥！");
        random_key
    })
});

// 为 Claims 实现 FromRequestParts
// 只要你的 API 处理函数里写了 `claims: Claims` 这个参数，Axum 就会自动先执行这段代码
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    // 原生 async fn，去掉了旧版的 #[async_trait]
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|value| value.to_str().ok());

        let auth_header = match auth_header {
            Some(header) => header,
            None => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    "缺少 Authorization 标头".to_string(),
                ));
            }
        };

        if !auth_header.starts_with("Bearer ") {
            return Err((StatusCode::UNAUTHORIZED, "Token 格式错误".to_string()));
        }
        let token = &auth_header[7..];

        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(JWT_SECRET.as_bytes()), // 👈 这里加上 .as_bytes()
            &Validation::default(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Token 无效或已过期".to_string()))?;

        Ok(token_data.claims)
    }
}
// 注意：不要在这里写 create_router，它应该在 routes.rs 中！

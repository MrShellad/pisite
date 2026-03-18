// backend/src/auth.rs
use crate::models::Claims;
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use jsonwebtoken::{DecodingKey, Validation, decode};

// 注意：生产环境中，请绝对要把这个秘钥放在 .env 环境变量里！
pub const JWT_SECRET: &[u8] = b"flowcore_super_secret_key_123456";

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
            &DecodingKey::from_secret(JWT_SECRET),
            &Validation::default(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Token 无效或已过期".to_string()))?;

        Ok(token_data.claims)
    }
}
// 注意：不要在这里写 create_router，它应该在 routes.rs 中！

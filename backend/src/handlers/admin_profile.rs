use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;

use bcrypt::{DEFAULT_COST, hash, verify};
use jsonwebtoken::{encode, Header, EncodingKey};

use crate::{
    auth::JWT_SECRET,
    models::{AdminProfileResponse, AuthResponse, Claims, AdminUser, UpdateAdminProfilePayload},
};

pub async fn get_profile(
    claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<AdminProfileResponse>, (StatusCode, String)> {
    let admin = sqlx::query_as::<_, AdminUser>("SELECT * FROM admin_users WHERE email = ?")
        .bind(&claims.sub)
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(_admin) = admin else {
        return Err((StatusCode::UNAUTHORIZED, "管理员身份无效".to_string()));
    };

    Ok(Json(AdminProfileResponse { email: claims.sub }))
}

pub async fn update_profile(
    claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<UpdateAdminProfilePayload>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    // 先找出当前管理员（用 token 的 sub 即当前 email）
    let admin = sqlx::query_as::<_, AdminUser>("SELECT * FROM admin_users WHERE email = ?")
        .bind(&claims.sub)
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(admin) = admin else {
        return Err((StatusCode::UNAUTHORIZED, "管理员身份无效".to_string()));
    };

    // 校验当前密码
    if !verify(&payload.currentPassword, &admin.password_hash).unwrap_or(false) {
        return Err((StatusCode::FORBIDDEN, "当前密码错误".to_string()));
    }

    // 新密码加密
    if payload.newPassword.len() < 6 {
        return Err((StatusCode::BAD_REQUEST, "新密码长度至少需要 6 位".to_string()));
    }
    let new_hash = hash(&payload.newPassword, DEFAULT_COST)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 更新邮箱与密码
    sqlx::query("UPDATE admin_users SET email = ?, password_hash = ? WHERE email = ?")
        .bind(&payload.newEmail)
        .bind(new_hash)
        .bind(&claims.sub)
        .execute(&pool)
        .await
        .map_err(|e| {
            // unique 约束等错误
            (StatusCode::BAD_REQUEST, format!("更新失败: {}", e))
        })?;

    // 签发新 token，确保后续请求 claims.sub 与新邮箱一致
    let expiration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
        + 24 * 3600;

    let new_claims = crate::models::Claims {
        sub: payload.newEmail,
        exp: expiration as usize,
    };
    let token = encode(
        &Header::default(),
        &new_claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse { token }))
}


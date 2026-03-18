// backend/src/handlers/auth.rs
use axum::{Json, extract::State, http::StatusCode};
use bcrypt::{DEFAULT_COST, hash, verify};
use jsonwebtoken::{EncodingKey, Header, encode};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::auth::JWT_SECRET;
use crate::models::{AdminUser, AuthResponse, InitPayload, LoginPayload};

// ==================== 身份验证与初始化模块 ====================

// 检查是否已经初始化超级管理员
pub async fn check_init(State(pool): State<SqlitePool>) -> Json<bool> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM admin_users")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));
    Json(count.0 == 0) // 如果为 0，说明需要初始化，返回 true
}

// 初始化超级管理员账号
pub async fn init_admin(
    State(pool): State<SqlitePool>,
    Json(payload): Json<InitPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM admin_users")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));
    if count.0 > 0 {
        return Err((StatusCode::BAD_REQUEST, "系统已初始化".to_string()));
    }

    let hashed = hash(&payload.password, DEFAULT_COST).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "密码加密失败".to_string(),
        )
    })?;

    sqlx::query("INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)")
        .bind("admin_1")
        .bind(payload.email)
        .bind(hashed)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("写入失败: {}", e),
            )
        })?;

    Ok(StatusCode::CREATED)
}

// 登录接口并下发 JWT Token
pub async fn login(
    State(pool): State<SqlitePool>,
    Json(payload): Json<LoginPayload>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, AdminUser>("SELECT * FROM admin_users WHERE email = ?")
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "查询异常".to_string()))?;

    if let Some(user) = user {
        if verify(&payload.password, &user.password_hash).unwrap_or(false) {
            let expiration = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                + 24 * 3600;
            let claims = crate::models::Claims {
                sub: user.email,
                exp: expiration as usize,
            };
            let token = encode(
                &Header::default(),
                &claims,
                &EncodingKey::from_secret(JWT_SECRET),
            )
            .unwrap();
            return Ok(Json(AuthResponse { token }));
        }
    }
    Err((StatusCode::UNAUTHORIZED, "邮箱或密码错误".to_string()))
}

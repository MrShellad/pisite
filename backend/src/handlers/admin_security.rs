use axum::{Json, extract::State, http::StatusCode};
use serde::Deserialize;
use sqlx::SqlitePool;

use crate::models::{
    AdminSecurityConfig, PublicAdminSecurityConfig, UpdateAdminSecurityConfigPayload,
};

const DEFAULT_SESSION_TIMEOUT_MINUTES: i32 = 30;
const MIN_SESSION_TIMEOUT_MINUTES: i32 = 5;
const MAX_SESSION_TIMEOUT_MINUTES: i32 = 24 * 60;

#[derive(sqlx::FromRow)]
struct AdminSecurityConfigSecretRow {
    session_timeout_minutes: i32,
    turnstile_enabled: bool,
    turnstile_site_key: String,
    turnstile_secret_key: String,
}

#[derive(Deserialize)]
struct TurnstileVerifyResponse {
    success: bool,
}

fn normalize_timeout_minutes(value: i32) -> i32 {
    value.clamp(MIN_SESSION_TIMEOUT_MINUTES, MAX_SESSION_TIMEOUT_MINUTES)
}

fn mask_secret(secret: &str) -> Option<String> {
    let trimmed = secret.trim();
    if trimmed.is_empty() {
        return None;
    }

    let chars: Vec<char> = trimmed.chars().collect();
    if chars.len() <= 8 {
        return Some("********".to_string());
    }

    let prefix: String = chars.iter().take(4).collect();
    let suffix: String = chars.iter().skip(chars.len() - 4).collect();
    Some(format!("{prefix}...{suffix}"))
}

async fn ensure_config(pool: &SqlitePool) -> Result<(), (StatusCode, String)> {
    sqlx::query(
        r#"INSERT OR IGNORE INTO admin_security_config (
            id,
            session_timeout_minutes,
            turnstile_enabled,
            turnstile_site_key,
            turnstile_secret_key,
            turnstile_secret_preview
        ) VALUES ('default', ?, 0, '', '', NULL)"#,
    )
    .bind(DEFAULT_SESSION_TIMEOUT_MINUTES)
    .execute(pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    Ok(())
}

async fn load_config_with_secret(
    pool: &SqlitePool,
) -> Result<AdminSecurityConfigSecretRow, (StatusCode, String)> {
    ensure_config(pool).await?;

    sqlx::query_as::<_, AdminSecurityConfigSecretRow>(
        r#"SELECT
            session_timeout_minutes,
            turnstile_enabled,
            turnstile_site_key,
            turnstile_secret_key
        FROM admin_security_config
        WHERE id = 'default'"#,
    )
    .fetch_one(pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
}

pub async fn get_session_timeout_minutes(pool: &SqlitePool) -> i32 {
    match load_config_with_secret(pool).await {
        Ok(config) => normalize_timeout_minutes(config.session_timeout_minutes),
        Err(_) => DEFAULT_SESSION_TIMEOUT_MINUTES,
    }
}

pub async fn verify_admin_login_turnstile(
    pool: &SqlitePool,
    token: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    let config = load_config_with_secret(pool).await?;
    if !config.turnstile_enabled {
        return Ok(());
    }

    if config.turnstile_site_key.trim().is_empty() || config.turnstile_secret_key.trim().is_empty()
    {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Cloudflare 人机验证尚未完成配置".to_string(),
        ));
    }

    let Some(token) = token.map(str::trim).filter(|value| !value.is_empty()) else {
        return Err((StatusCode::BAD_REQUEST, "请先完成人机验证".to_string()));
    };

    let response = reqwest::Client::new()
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
        .form(&[
            ("secret", config.turnstile_secret_key.as_str()),
            ("response", token),
        ])
        .send()
        .await
        .map_err(|error| {
            (
                StatusCode::BAD_GATEWAY,
                format!("Cloudflare 验证请求失败: {error}"),
            )
        })?;

    let result = response.json::<TurnstileVerifyResponse>().await.map_err(|error| {
        (
            StatusCode::BAD_GATEWAY,
            format!("Cloudflare 验证响应解析失败: {error}"),
        )
    })?;

    if result.success {
        Ok(())
    } else {
        Err((StatusCode::FORBIDDEN, "人机验证未通过".to_string()))
    }
}

pub async fn get_public_admin_security_config(
    State(pool): State<SqlitePool>,
) -> Result<Json<PublicAdminSecurityConfig>, (StatusCode, String)> {
    let config = load_config_with_secret(&pool).await?;

    Ok(Json(PublicAdminSecurityConfig {
        session_timeout_minutes: normalize_timeout_minutes(config.session_timeout_minutes),
        turnstile_enabled: config.turnstile_enabled,
        turnstile_site_key: config.turnstile_site_key,
    }))
}

pub async fn get_admin_security_config(
    State(pool): State<SqlitePool>,
) -> Result<Json<AdminSecurityConfig>, (StatusCode, String)> {
    ensure_config(&pool).await?;

    let config = sqlx::query_as::<_, AdminSecurityConfig>(
        r#"SELECT
            id,
            session_timeout_minutes,
            turnstile_enabled,
            turnstile_site_key,
            CASE WHEN LENGTH(COALESCE(turnstile_secret_key, '')) > 0 THEN 1 ELSE 0 END AS has_turnstile_secret,
            turnstile_secret_preview,
            updated_at
        FROM admin_security_config
        WHERE id = 'default'"#,
    )
    .fetch_one(&pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    Ok(Json(config))
}

pub async fn update_admin_security_config(
    State(pool): State<SqlitePool>,
    Json(payload): Json<UpdateAdminSecurityConfigPayload>,
) -> Result<Json<AdminSecurityConfig>, (StatusCode, String)> {
    ensure_config(&pool).await?;

    let current_secret: (String,) = sqlx::query_as(
        "SELECT turnstile_secret_key FROM admin_security_config WHERE id = 'default'",
    )
    .fetch_one(&pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let secret_key = if payload.clear_turnstile_secret {
        String::new()
    } else if let Some(secret) = payload.turnstile_secret_key {
        let trimmed = secret.trim();
        if trimmed.is_empty() {
            current_secret.0
        } else {
            trimmed.to_string()
        }
    } else {
        current_secret.0
    };

    let site_key = payload.turnstile_site_key.trim().to_string();
    if payload.turnstile_enabled && (site_key.is_empty() || secret_key.trim().is_empty()) {
        return Err((
            StatusCode::BAD_REQUEST,
            "启用 Cloudflare 人机验证前，请填写 Site Key 和 Secret Key".to_string(),
        ));
    }

    sqlx::query(
        r#"UPDATE admin_security_config
        SET session_timeout_minutes = ?,
            turnstile_enabled = ?,
            turnstile_site_key = ?,
            turnstile_secret_key = ?,
            turnstile_secret_preview = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 'default'"#,
    )
    .bind(normalize_timeout_minutes(payload.session_timeout_minutes))
    .bind(payload.turnstile_enabled)
    .bind(site_key)
    .bind(&secret_key)
    .bind(mask_secret(&secret_key))
    .execute(&pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    get_admin_security_config(State(pool)).await
}

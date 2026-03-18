use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{
    ApiAccessLog, ApiKey, ApiKeyCreatePayload, ApiKeyUpdatePayload, Claims,
};

pub async fn list_api_keys(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ApiKey>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, ApiKey>(
        "SELECT id, name, key, scopes, rate_limit_per_minute, is_active, created_at, last_used_at
         FROM api_keys
         ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn create_api_key(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<ApiKeyCreatePayload>,
) -> Result<Json<ApiKey>, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    let key = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO api_keys (id, name, key, scopes, rate_limit_per_minute, is_active)
         VALUES (?, ?, ?, ?, ?, 1)",
    )
    .bind(&id)
    .bind(&payload.name)
    .bind(&key)
    .bind(&payload.scopes)
    .bind(payload.rate_limit_per_minute)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let created = sqlx::query_as::<_, ApiKey>(
        "SELECT id, name, key, scopes, rate_limit_per_minute, is_active, created_at, last_used_at
         FROM api_keys
         WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(created))
}

pub async fn update_api_key(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<ApiKeyUpdatePayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query(
        "UPDATE api_keys
         SET name = ?, scopes = ?, rate_limit_per_minute = ?, is_active = ?
         WHERE id = ?",
    )
    .bind(&payload.name)
    .bind(&payload.scopes)
    .bind(payload.rate_limit_per_minute)
    .bind(payload.is_active)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok(StatusCode::OK)
}

pub async fn delete_api_key(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM api_keys WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_logs(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ApiAccessLog>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, ApiAccessLog>(
        "SELECT id, key_id, path, method, status, ip, created_at
         FROM api_access_logs
         ORDER BY created_at DESC
         LIMIT 500",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}


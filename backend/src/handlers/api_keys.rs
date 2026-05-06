use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{
    ApiAccessLog, ApiKey, ApiKeyCreatePayload, ApiKeyUpdatePayload, ApiWarningItem, Claims,
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

pub async fn list_warnings(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ApiWarningItem>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, ApiWarningItem>(
        "SELECT
            latest.path,
            latest.method,
            latest.status AS latest_status,
            grouped.error_count,
            grouped.client_error_count,
            grouped.server_error_count,
            latest.created_at AS last_seen_at
         FROM (
            SELECT
                path,
                method,
                COUNT(*) AS error_count,
                SUM(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE 0 END) AS client_error_count,
                SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS server_error_count,
                MAX(id) AS latest_id
            FROM api_access_logs
            WHERE status >= 400
            GROUP BY path, method
         ) grouped
         INNER JOIN api_access_logs latest ON latest.id = grouped.latest_id
         ORDER BY grouped.server_error_count DESC, grouped.error_count DESC, latest.id DESC
         LIMIT 100",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(rows))
}

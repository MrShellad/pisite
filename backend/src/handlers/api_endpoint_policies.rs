use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;

use crate::models::{ApiEndpointPolicy, Claims, UpdateApiEndpointPolicyPayload};

pub async fn list_policies(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ApiEndpointPolicy>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, ApiEndpointPolicy>(
        "SELECT id, method, path_template, group_name, public_enabled, require_api_key, created_at, updated_at
         FROM api_endpoint_policies
         ORDER BY group_name ASC, path_template ASC, method ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn update_policy(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateApiEndpointPolicyPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query(
        "UPDATE api_endpoint_policies
         SET public_enabled = ?, require_api_key = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
    )
    .bind(payload.public_enabled)
    .bind(payload.require_api_key)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok(StatusCode::OK)
}


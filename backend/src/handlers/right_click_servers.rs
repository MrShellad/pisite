use ammonia::clean;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde_json::json;
use sqlx::SqlitePool;

use crate::models::{
    CreateRightClickServerPayload, RightClickServer, UpdateRightClickServerPayload,
};

fn sanitize_port(port: i32) -> Result<i32, (StatusCode, String)> {
    if !(1..=65_535).contains(&port) {
        return Err((StatusCode::BAD_REQUEST, "Invalid server port".to_string()));
    }
    Ok(port)
}

pub async fn list_public_right_click_servers(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<RightClickServer>>, (StatusCode, String)> {
    let items = sqlx::query_as::<_, RightClickServer>(
        "SELECT id, name, host, port, version_hint, icon_url, priority, enabled, created_at
         FROM right_click_servers
         WHERE enabled = 1
         ORDER BY priority DESC, datetime(created_at) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(items))
}

pub async fn list_right_click_servers(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<RightClickServer>>, (StatusCode, String)> {
    let items = sqlx::query_as::<_, RightClickServer>(
        "SELECT id, name, host, port, version_hint, icon_url, priority, enabled, created_at
         FROM right_click_servers
         ORDER BY priority DESC, datetime(created_at) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(items))
}

pub async fn create_right_click_server(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateRightClickServerPayload>,
) -> impl IntoResponse {
    let safe_port = match sanitize_port(payload.port) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };

    let result = sqlx::query(
        "INSERT INTO right_click_servers (
            id, name, host, port, version_hint, icon_url, priority, enabled
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(payload.id.trim())
    .bind(clean(&payload.name).trim())
    .bind(payload.host.trim())
    .bind(safe_port)
    .bind(clean(&payload.version_hint).trim())
    .bind(payload.icon_url.trim())
    .bind(payload.priority)
    .bind(payload.enabled)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => (
            StatusCode::CREATED,
            Json(json!({ "msg": "Right click server created successfully" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn update_right_click_server(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateRightClickServerPayload>,
) -> impl IntoResponse {
    let safe_port = match sanitize_port(payload.port) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };

    let result = sqlx::query(
        "UPDATE right_click_servers
         SET name = ?, host = ?, port = ?, version_hint = ?, icon_url = ?, priority = ?, enabled = ?
         WHERE id = ?",
    )
    .bind(clean(&payload.name).trim())
    .bind(payload.host.trim())
    .bind(safe_port)
    .bind(clean(&payload.version_hint).trim())
    .bind(payload.icon_url.trim())
    .bind(payload.priority)
    .bind(payload.enabled)
    .bind(id.trim())
    .execute(&pool)
    .await;

    match result {
        Ok(rows) if rows.rows_affected() > 0 => (
            StatusCode::OK,
            Json(json!({ "msg": "Right click server updated successfully" })),
        )
            .into_response(),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Right click server not found" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn delete_right_click_server(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM right_click_servers WHERE id = ?")
        .bind(id.trim())
        .execute(&pool)
        .await;

    match result {
        Ok(rows) if rows.rows_affected() > 0 => (
            StatusCode::OK,
            Json(json!({ "msg": "Right click server deleted successfully" })),
        )
            .into_response(),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Right click server not found" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn toggle_right_click_server(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let result =
        sqlx::query("UPDATE right_click_servers SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?")
            .bind(id.trim())
            .execute(&pool)
            .await;

    match result {
        Ok(rows) if rows.rows_affected() > 0 => (
            StatusCode::OK,
            Json(json!({ "msg": "Right click server toggled successfully" })),
        )
            .into_response(),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Right click server not found" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

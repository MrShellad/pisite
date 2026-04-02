use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sqlx::SqlitePool;

use crate::models::{SignalingServer, CreateSignalingServerPayload, UpdateSignalingServerPayload};
use std::time::{SystemTime, UNIX_EPOCH};

// =========================================
// 公开客户端 API (需经过 API Key 中间件鉴权 & 限流)
// =========================================

pub async fn get_public_signaling_servers(State(pool): State<SqlitePool>) -> impl IntoResponse {
    let servers = sqlx::query_as::<_, SignalingServer>("SELECT * FROM signaling_servers WHERE enabled = 1 ORDER BY priority DESC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    // 格式化为客户端 PiHub 需要的嵌套格式:
    // { "version": "1.0", "updated_at": 1712345678, "ttl": 300, "servers": [...] }
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

    let formatted_servers: Vec<serde_json::Value> = servers.into_iter().map(|s| {
        json!({
            "id": s.id,
            "url": s.url,
            "region": s.region,
            "provider": s.provider,
            "priority": s.priority,
            "weight": s.weight,
            "secure": s.secure,
            "features": {
                "p2p": s.features_p2p,
                "relay": s.features_relay
            },
            "limits": {
                "max_connections": s.limits_max_connections
            }
        })
    }).collect();

    Json(json!({
        "version": "1.0",
        "updated_at": now,
        "ttl": 300,
        "servers": formatted_servers
    }))
}

// =========================================
// 后台 Admin 管理接口
// =========================================

pub async fn list_signaling_servers(State(pool): State<SqlitePool>) -> impl IntoResponse {
    let servers = sqlx::query_as::<_, SignalingServer>("SELECT * FROM signaling_servers ORDER BY priority DESC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    Json(servers)
}

pub async fn add_signaling_server(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateSignalingServerPayload>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "INSERT INTO signaling_servers (id, url, region, provider, priority, weight, secure, features_p2p, features_relay, limits_max_connections, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&payload.id)
    .bind(&payload.url)
    .bind(&payload.region)
    .bind(&payload.provider)
    .bind(payload.priority)
    .bind(payload.weight)
    .bind(payload.secure)
    .bind(payload.features_p2p)
    .bind(payload.features_relay)
    .bind(payload.limits_max_connections)
    .bind(payload.enabled)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => (StatusCode::CREATED, Json(json!({"msg": "Signaling server created successfully"}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))),
    }
}

pub async fn update_signaling_server(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateSignalingServerPayload>,
) -> impl IntoResponse {
    let result = sqlx::query(
        "UPDATE signaling_servers
         SET url = ?, region = ?, provider = ?, priority = ?, weight = ?, secure = ?, features_p2p = ?, features_relay = ?, limits_max_connections = ?, enabled = ?
         WHERE id = ?"
    )
    .bind(&payload.url)
    .bind(&payload.region)
    .bind(&payload.provider)
    .bind(payload.priority)
    .bind(payload.weight)
    .bind(payload.secure)
    .bind(payload.features_p2p)
    .bind(payload.features_relay)
    .bind(payload.limits_max_connections)
    .bind(payload.enabled)
    .bind(&id)
    .execute(&pool)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, Json(json!({"msg": "Signaling server updated successfully"}))),
        Ok(_) => (StatusCode::NOT_FOUND, Json(json!({"error": "Signaling server not found"}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))),
    }
}

pub async fn delete_signaling_server(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM signaling_servers WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, Json(json!({"msg": "Signaling server deleted successfully"}))),
        Ok(_) => (StatusCode::NOT_FOUND, Json(json!({"error": "Signaling server not found"}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))),
    }
}

pub async fn toggle_signaling_server(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let result = sqlx::query("UPDATE signaling_servers SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => (StatusCode::OK, Json(json!({"msg": "Signaling server toggled successfully"}))),
        Ok(_) => (StatusCode::NOT_FOUND, Json(json!({"error": "Signaling server not found"}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))),
    }
}

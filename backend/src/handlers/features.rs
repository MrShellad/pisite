// backend/src/handlers/features.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;
use crate::models::{Claims, Feature};

// ==================== 核心特性模块 ====================

// 前台接口：仅获取已启用的特性
pub async fn get_features(State(pool): State<SqlitePool>) -> Json<Vec<Feature>> {
    let features = sqlx::query_as::<_, Feature>(
        "SELECT * FROM features WHERE enabled = 1 ORDER BY priority ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|_| vec![]);
    Json(features)
}

// 后台接口：获取所有特性
pub async fn get_all_features(
    _claims: Claims, 
    State(pool): State<SqlitePool>
) -> Json<Vec<Feature>> {
    let features = sqlx::query_as::<_, Feature>(
        "SELECT * FROM features ORDER BY priority ASC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|_| vec![]);
    Json(features)
}

// 添加特性
pub async fn add_feature(
    _claims: Claims, 
    State(pool): State<SqlitePool>, 
    Json(payload): Json<Feature>
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query(
        "INSERT INTO features (id, icon_svg, icon_color, title, desc, priority, enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(payload.id)
    .bind(payload.icon_svg)
    .bind(payload.icon_color)
    .bind(payload.title)
    .bind(payload.desc)
    .bind(payload.priority)
    .bind(payload.enabled)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(StatusCode::CREATED)
}

// 切换特性启用状态
pub async fn toggle_feature(
    _claims: Claims, 
    State(pool): State<SqlitePool>, 
    Path(id): Path<String>
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE features SET enabled = NOT enabled WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

// 删除特性
pub async fn delete_feature(
    _claims: Claims, 
    State(pool): State<SqlitePool>, 
    Path(id): Path<String>
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM features WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}
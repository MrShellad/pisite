// backend/src/handlers/sponsors.rs
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;
use crate::models::{Claims, Sponsor};

// ==================== 赞助商模块 ====================

// 前台接口：获取所有启用的赞助商
pub async fn get_sponsors(State(pool): State<SqlitePool>) -> Json<Vec<Sponsor>> {
    let sponsors = sqlx::query_as::<_, Sponsor>("SELECT * FROM sponsors WHERE enabled = 1 ORDER BY priority ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_else(|_| vec![]);
    Json(sponsors)
}

// 后台接口：获取所有赞助商
pub async fn get_all_sponsors(
    _claims: Claims,
    State(pool): State<SqlitePool>
) -> Json<Vec<Sponsor>> {
    let sponsors = sqlx::query_as::<_, Sponsor>("SELECT * FROM sponsors ORDER BY priority ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_else(|_| vec![]);
    Json(sponsors)
}

// 后台接口：切换赞助商状态
pub async fn toggle_sponsor(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("UPDATE sponsors SET enabled = NOT enabled WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Ok(StatusCode::OK),
        _ => Err((StatusCode::INTERNAL_SERVER_ERROR, "切换状态失败".to_string())),
    }
}

// 后台接口：添加赞助商
pub async fn add_sponsor(
    _claims: Claims, 
    State(pool): State<SqlitePool>,
    Json(payload): Json<Sponsor>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        "INSERT INTO sponsors (id, icon, name, desc, tags, price, link, regions, priority, border_color, background_color, text_color, enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(payload.id)
    .bind(payload.icon)
    .bind(payload.name)
    .bind(payload.desc)
    .bind(payload.tags)
    .bind(payload.price)
    .bind(payload.link)
    .bind(payload.regions)
    .bind(payload.priority)
    .bind(payload.border_color)
    .bind(payload.background_color)
    .bind(payload.text_color)
    .bind(payload.enabled)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Ok(StatusCode::CREATED),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("插入失败: {}", e))),
    }
}

// 后台接口：删除赞助商
pub async fn delete_sponsor(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM sponsors WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Ok(StatusCode::NO_CONTENT),
        Ok(_) => Err((StatusCode::NOT_FOUND, "未找到该赞助商".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, format!("数据库删除失败: {}", e))),
    }
}
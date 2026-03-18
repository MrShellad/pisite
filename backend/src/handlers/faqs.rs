// backend/src/handlers/faqs.rs
use crate::models::{Claims, Faq};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;

// ==================== FAQ 模块 ====================

// 前台：只获取已启用的 FAQ，按优先级排序
pub async fn get_faqs(State(pool): State<SqlitePool>) -> Json<Vec<Faq>> {
    let faqs =
        sqlx::query_as::<_, Faq>("SELECT * FROM faqs WHERE enabled = 1 ORDER BY priority ASC")
            .fetch_all(&pool)
            .await
            .unwrap_or_else(|_| vec![]);
    Json(faqs)
}

// 后台：获取所有 FAQ
pub async fn get_all_faqs(_claims: Claims, State(pool): State<SqlitePool>) -> Json<Vec<Faq>> {
    let faqs = sqlx::query_as::<_, Faq>("SELECT * FROM faqs ORDER BY priority ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_else(|_| vec![]);
    Json(faqs)
}

// 添加 FAQ
pub async fn add_faq(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<Faq>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("INSERT INTO faqs (id, question, answer, icon_svg, icon_color, priority, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(payload.id).bind(payload.question).bind(payload.answer).bind(payload.icon_svg).bind(payload.icon_color).bind(payload.priority).bind(payload.enabled)
        .execute(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::CREATED)
}

// 切换 FAQ 启用状态
pub async fn toggle_faq(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE faqs SET enabled = NOT enabled WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

// 删除 FAQ
pub async fn delete_faq(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM faqs WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

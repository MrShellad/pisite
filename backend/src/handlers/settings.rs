// backend/src/handlers/settings.rs
use crate::models::{Claims, SiteSettings};
use axum::{Json, extract::State, http::StatusCode};
use sqlx::SqlitePool;

// ==================== 全局系统设置模块 ====================

// 获取全局设置 (前台与后台共用)
pub async fn get_settings(State(pool): State<SqlitePool>) -> Json<SiteSettings> {
    let config = sqlx::query_as::<_, SiteSettings>("SELECT * FROM site_settings WHERE id = '1'")
        .fetch_one(&pool)
        .await
        .unwrap();
    Json(config)
}

// 更新全局设置 (后台保护)
pub async fn update_settings(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<SiteSettings>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE site_settings SET site_name=?, seo_title=?, seo_description=?, seo_keywords=?, github_url=?, twitter_url=?, discord_url=?, contact_email=?, copyright=? WHERE id='1'")
    .bind(payload.site_name).bind(payload.seo_title).bind(payload.seo_description).bind(payload.seo_keywords)
    .bind(payload.github_url).bind(payload.twitter_url).bind(payload.discord_url).bind(payload.contact_email).bind(payload.copyright)
    .execute(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

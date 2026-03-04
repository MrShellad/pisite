// backend/src/handlers/hero.rs
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;
use crate::models::{Claims, HeroConfig};

// ==================== 首屏 (Hero) 配置模块 ====================

// 获取 Hero 配置 (前台公开)
pub async fn get_hero(State(pool): State<SqlitePool>) -> Json<HeroConfig> {
    // 直接拿 ID 为 1 的那条数据
    let config = sqlx::query_as::<_, HeroConfig>("SELECT * FROM hero_config WHERE id = '1'")
        .fetch_one(&pool).await.unwrap();
    Json(config)
}

// 更新 Hero 配置 (后台保护)
pub async fn update_hero(
    _claims: Claims, 
    State(pool): State<SqlitePool>, 
    Json(payload): Json<HeroConfig>
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE hero_config SET logo_url=?, logo_color=?, title=?, subtitle=?, description=?, button_text=?, update_date=?, dl_mac=?, dl_win=?, dl_linux=? WHERE id='1'")
    .bind(payload.logo_url)
    .bind(payload.logo_color)
    .bind(payload.title)
    .bind(payload.subtitle)
    .bind(payload.description)
    .bind(payload.button_text)
    .bind(payload.update_date)
    .bind(payload.dl_mac)
    .bind(payload.dl_win)
    .bind(payload.dl_linux)
    .execute(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(StatusCode::OK)
}
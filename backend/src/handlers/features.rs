// backend/src/handlers/features.rs
use crate::{
    handlers::svg_sanitizer::sanitize_svg,
    models::{Claims, Feature, FeatureScreenshot, FeatureScreenshotPayload},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;
use uuid::Uuid;

// ==================== 核心特性模块 ====================

// 前台接口：仅获取已启用的特性
pub async fn get_features(State(pool): State<SqlitePool>) -> Json<Vec<Feature>> {
    let mut features = sqlx::query_as::<_, Feature>(
        "SELECT * FROM features WHERE enabled = 1 ORDER BY priority ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|_| vec![]);
    sanitize_features(&mut features);
    Json(features)
}

pub async fn get_feature_screenshots(State(pool): State<SqlitePool>) -> Json<Vec<FeatureScreenshot>> {
    let screenshots = sqlx::query_as::<_, FeatureScreenshot>(
        "SELECT id, image_url, title, caption, priority FROM feature_screenshots ORDER BY priority ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|_| vec![]);

    Json(screenshots)
}

// 后台接口：获取所有特性
pub async fn get_all_features(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Json<Vec<Feature>> {
    let mut features = sqlx::query_as::<_, Feature>("SELECT * FROM features ORDER BY priority ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_else(|_| vec![]);
    sanitize_features(&mut features);
    Json(features)
}

pub async fn get_all_feature_screenshots(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Json<Vec<FeatureScreenshot>> {
    let screenshots = sqlx::query_as::<_, FeatureScreenshot>(
        "SELECT id, image_url, title, caption, priority FROM feature_screenshots ORDER BY priority ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_else(|_| vec![]);

    Json(screenshots)
}

fn sanitize_features(features: &mut [Feature]) {
    for feature in features {
        feature.icon_svg = sanitize_svg(&feature.icon_svg);
    }
}

fn normalize_screenshot_payload(
    payload: FeatureScreenshotPayload,
) -> Result<FeatureScreenshotPayload, (StatusCode, String)> {
    let image_url = payload.image_url.trim().to_string();
    if image_url.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "imageUrl is required".to_string()));
    }

    Ok(FeatureScreenshotPayload {
        image_url,
        title: payload.title.trim().to_string(),
        caption: payload.caption.trim().to_string(),
        priority: payload.priority,
    })
}

// 添加特性
pub async fn add_feature(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<Feature>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query(
        "INSERT INTO features (id, icon_svg, icon_color, title, desc, priority, enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(payload.id)
    .bind(sanitize_svg(&payload.icon_svg))
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

pub async fn add_feature_screenshot(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<FeatureScreenshotPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let payload = normalize_screenshot_payload(payload)?;
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO feature_screenshots (id, image_url, title, caption, priority)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(payload.image_url)
    .bind(payload.title)
    .bind(payload.caption)
    .bind(payload.priority)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::CREATED)
}

pub async fn update_feature_screenshot(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<FeatureScreenshotPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let payload = normalize_screenshot_payload(payload)?;

    let result = sqlx::query(
        "UPDATE feature_screenshots
         SET image_url = ?, title = ?, caption = ?, priority = ?
         WHERE id = ?",
    )
    .bind(payload.image_url)
    .bind(payload.title)
    .bind(payload.caption)
    .bind(payload.priority)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Screenshot not found".to_string()));
    }

    Ok(StatusCode::OK)
}

// 切换特性启用状态
pub async fn toggle_feature(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE features SET enabled = NOT enabled WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

pub async fn delete_feature_screenshot(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM feature_screenshots WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Screenshot not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

// 删除特性
pub async fn delete_feature(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM features WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

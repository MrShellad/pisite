use crate::models::{Claims, LegalPage, LegalPagePayload};
use ammonia::clean;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;

const ALLOWED_LEGAL_SLUGS: [&str; 2] = ["privacy", "terms"];

pub async fn get_public_legal_page(
    State(pool): State<SqlitePool>,
    Path(slug): Path<String>,
) -> Result<Json<LegalPage>, (StatusCode, String)> {
    if !is_allowed_legal_slug(&slug) {
        return Err((StatusCode::NOT_FOUND, "Legal page not found".to_string()));
    }

    let page = sqlx::query_as::<_, LegalPage>(
        "SELECT slug, title, content_html, updated_at FROM legal_pages WHERE slug = ?",
    )
    .bind(slug)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Legal page not found".to_string()))?;

    Ok(Json(page))
}

pub async fn list_admin_legal_pages(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<LegalPage>>, (StatusCode, String)> {
    let pages = sqlx::query_as::<_, LegalPage>(
        "SELECT slug, title, content_html, updated_at
         FROM legal_pages
         WHERE slug IN ('privacy', 'terms')
         ORDER BY CASE slug WHEN 'privacy' THEN 0 ELSE 1 END",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(pages))
}

pub async fn update_admin_legal_page(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(slug): Path<String>,
    Json(payload): Json<LegalPagePayload>,
) -> Result<Json<LegalPage>, (StatusCode, String)> {
    if !is_allowed_legal_slug(&slug) {
        return Err((StatusCode::NOT_FOUND, "Legal page not found".to_string()));
    }

    let title = clean(&payload.title).trim().to_string();
    let content_html = clean(&payload.content_html).trim().to_string();

    if title.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "title is required".to_string()));
    }
    if title.len() > 128 {
        return Err((StatusCode::BAD_REQUEST, "title is too long".to_string()));
    }

    let page = sqlx::query_as::<_, LegalPage>(
        "INSERT INTO legal_pages (slug, title, content_html, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(slug) DO UPDATE SET
            title = excluded.title,
            content_html = excluded.content_html,
            updated_at = CURRENT_TIMESTAMP
         RETURNING slug, title, content_html, updated_at",
    )
    .bind(slug)
    .bind(title)
    .bind(content_html)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(page))
}

fn is_allowed_legal_slug(slug: &str) -> bool {
    ALLOWED_LEGAL_SLUGS.contains(&slug)
}

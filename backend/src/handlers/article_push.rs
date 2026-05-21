use ammonia::{Builder, UrlRelative};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use tokio::time::{Duration, sleep};
use uuid::Uuid;

use crate::models::{ArticlePush, ArticlePushPayload, Claims};

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ArticlePushQuery {
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub offset: Option<i64>,
}

fn clean_text(value: &str) -> String {
    value.trim().to_string()
}

static HTML_TAG_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<[^>]*>").expect("valid html tag regex"));

fn class_set() -> HashSet<&'static str> {
    [
        "ql-align-center",
        "ql-align-right",
        "ql-align-justify",
        "ql-direction-rtl",
        "ql-font-serif",
        "ql-font-monospace",
        "ql-size-small",
        "ql-size-large",
        "ql-size-huge",
        "ql-video",
        "ql-indent-1",
        "ql-indent-2",
        "ql-indent-3",
        "ql-indent-4",
        "ql-indent-5",
        "ql-indent-6",
        "ql-indent-7",
        "ql-indent-8",
    ]
    .into_iter()
    .collect()
}

fn allowed_quill_classes() -> HashMap<&'static str, HashSet<&'static str>> {
    [
        "p",
        "div",
        "span",
        "a",
        "blockquote",
        "pre",
        "ol",
        "ul",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "img",
        "iframe",
    ]
    .into_iter()
    .map(|tag| (tag, class_set()))
    .collect()
}

fn allowed_style_properties() -> HashSet<&'static str> {
    [
        "background-color",
        "color",
        "font-family",
        "font-size",
        "font-style",
        "font-weight",
        "text-align",
        "text-decoration",
    ]
    .into_iter()
    .collect()
}

fn sanitize_media_attribute<'a>(
    element: &str,
    attribute: &str,
    value: &'a str,
) -> Option<Cow<'a, str>> {
    if attribute.starts_with("on") {
        return None;
    }

    if element == "iframe" && attribute == "src" {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return None;
        }
        return Some(trimmed.into());
    }

    Some(value.into())
}

fn sanitize_article_push_html(value: &str) -> String {
    Builder::new()
        .add_tags(&["iframe", "video", "source"])
        .add_generic_attributes(&["style"])
        .add_tag_attributes("a", &["target"])
        .add_tag_attributes(
            "iframe",
            &[
                "allow",
                "allowfullscreen",
                "frameborder",
                "height",
                "loading",
                "referrerpolicy",
                "sandbox",
                "src",
                "title",
                "width",
            ],
        )
        .add_tag_attributes(
            "video",
            &["controls", "height", "poster", "preload", "src", "width"],
        )
        .add_tag_attributes("source", &["src", "type"])
        .allowed_classes(allowed_quill_classes())
        .filter_style_properties(allowed_style_properties())
        .set_tag_attribute_value("a", "target", "_blank")
        .set_tag_attribute_value("iframe", "loading", "lazy")
        .set_tag_attribute_value(
            "iframe",
            "referrerpolicy",
            "strict-origin-when-cross-origin",
        )
        .set_tag_attribute_value(
            "iframe",
            "sandbox",
            "allow-scripts allow-same-origin allow-presentation",
        )
        .url_relative(UrlRelative::PassThrough)
        .attribute_filter(sanitize_media_attribute)
        .clean(value)
        .to_string()
        .trim()
        .to_string()
}

fn article_push_content_has_body(content: &str) -> bool {
    let lower = content.to_ascii_lowercase();
    if lower.contains("<img") || lower.contains("<iframe") || lower.contains("<video") {
        return true;
    }

    let without_tags = HTML_TAG_RE.replace_all(content, "");
    let normalized = without_tags
        .replace("&nbsp;", " ")
        .replace("&#160;", " ")
        .replace('\u{00a0}', " ");
    !normalized.trim().is_empty()
}

fn sanitize_article_push_rows(rows: &mut [ArticlePush]) {
    for row in rows {
        row.content = sanitize_article_push_html(&row.content);
    }
}

fn clean_optional_datetime(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.replace('T', " "))
}

fn validate_payload(
    payload: &ArticlePushPayload,
    content: &str,
) -> Result<(), (StatusCode, String)> {
    if clean_text(&payload.title).is_empty() {
        return Err((StatusCode::BAD_REQUEST, "标题不能为空".to_string()));
    }
    if !article_push_content_has_body(content) {
        return Err((StatusCode::BAD_REQUEST, "内容不能为空".to_string()));
    }
    if clean_text(&payload.category).is_empty() {
        return Err((StatusCode::BAD_REQUEST, "分类不能为空".to_string()));
    }
    if clean_optional_datetime(payload.expires_at.as_deref()).is_none() {
        return Err((StatusCode::BAD_REQUEST, "过期时间不能为空".to_string()));
    }
    Ok(())
}

fn article_push_select_sql() -> &'static str {
    "SELECT id, title, cover, content, related_link, category, enabled, expires_at, created_at, updated_at \
     FROM article_pushes"
}

async fn query_article_pushes(
    pool: &SqlitePool,
    query: &ArticlePushQuery,
    only_enabled: bool,
    max_limit: i64,
) -> Result<Vec<ArticlePush>, (StatusCode, String)> {
    let mut builder =
        QueryBuilder::<Sqlite>::new(format!("{} WHERE 1 = 1", article_push_select_sql()));

    if only_enabled {
        builder.push(
            " AND enabled = 1 AND (expires_at IS NULL OR datetime(expires_at) > datetime('now', '+8 hours'))",
        );
    }

    if let Some(category) = query
        .category
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        builder.push(" AND category = ").push_bind(category);
    }

    builder.push(" ORDER BY datetime(created_at) DESC");

    let limit = query.limit.unwrap_or(20).clamp(1, max_limit);
    let offset = query.offset.unwrap_or(0).max(0);
    builder
        .push(" LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);

    builder
        .build_query_as::<ArticlePush>()
        .fetch_all(pool)
        .await
        .map(|mut rows| {
            sanitize_article_push_rows(&mut rows);
            rows
        })
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn get_public_article_pushes(
    Query(query): Query<ArticlePushQuery>,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ArticlePush>>, (StatusCode, String)> {
    let pushes = query_article_pushes(&pool, &query, true, 50).await?;
    Ok(Json(pushes))
}

pub async fn get_latest_public_article_push(
    State(pool): State<SqlitePool>,
) -> Result<Json<ArticlePush>, (StatusCode, String)> {
    let latest = sqlx::query_as::<_, ArticlePush>(
        "SELECT id, title, cover, content, related_link, category, enabled, expires_at, created_at, updated_at \
         FROM article_pushes \
         WHERE enabled = 1 AND (expires_at IS NULL OR datetime(expires_at) > datetime('now', '+8 hours')) \
         ORDER BY datetime(created_at) DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    latest
        .map(|mut item| {
            item.content = sanitize_article_push_html(&item.content);
            item
        })
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "暂无活动 PUSH".to_string()))
}

pub async fn get_admin_article_pushes(
    _claims: Claims,
    Query(query): Query<ArticlePushQuery>,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ArticlePush>>, (StatusCode, String)> {
    let pushes = query_article_pushes(&pool, &query, false, 200).await?;
    Ok(Json(pushes))
}

pub async fn create_article_push(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<ArticlePushPayload>,
) -> Result<(StatusCode, Json<ArticlePush>), (StatusCode, String)> {
    let content = sanitize_article_push_html(&payload.content);
    validate_payload(&payload, &content)?;

    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO article_pushes (id, title, cover, content, related_link, category, enabled, expires_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(clean_text(&payload.title))
    .bind(clean_text(&payload.cover))
    .bind(content)
    .bind(clean_text(&payload.related_link))
    .bind(clean_text(&payload.category))
    .bind(payload.enabled.unwrap_or(true))
    .bind(clean_optional_datetime(payload.expires_at.as_deref()))
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut created = sqlx::query_as::<_, ArticlePush>(
        "SELECT id, title, cover, content, related_link, category, enabled, expires_at, created_at, updated_at \
         FROM article_pushes WHERE id = ?",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    created.content = sanitize_article_push_html(&created.content);

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_article_push(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<ArticlePushPayload>,
) -> Result<Json<ArticlePush>, (StatusCode, String)> {
    let content = sanitize_article_push_html(&payload.content);
    validate_payload(&payload, &content)?;

    let previous_cover =
        sqlx::query_as::<_, (String,)>("SELECT cover FROM article_pushes WHERE id = ?")
            .bind(&id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::NOT_FOUND, "活动 PUSH 不存在".to_string()))?
            .0;

    let result = sqlx::query(
        "UPDATE article_pushes \
         SET title = ?, cover = ?, content = ?, related_link = ?, category = ?, enabled = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?",
    )
    .bind(clean_text(&payload.title))
    .bind(clean_text(&payload.cover))
    .bind(content)
    .bind(clean_text(&payload.related_link))
    .bind(clean_text(&payload.category))
    .bind(payload.enabled.unwrap_or(true))
    .bind(clean_optional_datetime(payload.expires_at.as_deref()))
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "活动 PUSH 不存在".to_string()));
    }

    let mut updated = sqlx::query_as::<_, ArticlePush>(
        "SELECT id, title, cover, content, related_link, category, enabled, expires_at, created_at, updated_at \
         FROM article_pushes WHERE id = ?",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if previous_cover != updated.cover {
        remove_local_cover_if_unshared(&pool, &previous_cover).await;
    }

    updated.content = sanitize_article_push_html(&updated.content);

    Ok(Json(updated))
}

pub async fn toggle_article_push(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        "UPDATE article_pushes SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "活动 PUSH 不存在".to_string()));
    }

    Ok(StatusCode::OK)
}

pub async fn delete_article_push(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let previous_cover =
        sqlx::query_as::<_, (String,)>("SELECT cover FROM article_pushes WHERE id = ?")
            .bind(&id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::NOT_FOUND, "活动 PUSH 不存在".to_string()))?
            .0;

    let result = sqlx::query("DELETE FROM article_pushes WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "活动 PUSH 不存在".to_string()));
    }

    remove_local_cover_if_unshared(&pool, &previous_cover).await;

    Ok(StatusCode::NO_CONTENT)
}

fn local_admin_upload_path(cover: &str) -> Option<PathBuf> {
    let file_name = cover.strip_prefix("/uploads/admin/")?;
    if file_name.is_empty() || file_name.contains('/') || file_name.contains('\\') {
        return None;
    }
    Some(PathBuf::from("./uploads/admin").join(file_name))
}

async fn remove_local_cover_if_unshared(pool: &SqlitePool, cover: &str) {
    let Some(path) = local_admin_upload_path(cover) else {
        return;
    };

    let shared_count =
        sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM article_pushes WHERE cover = ?")
            .bind(cover)
            .fetch_one(pool)
            .await
            .unwrap_or((1,));

    if shared_count.0 == 0 {
        let _ = tokio::fs::remove_file(path).await;
    }
}

pub async fn cleanup_expired_article_pushes(pool: &SqlitePool) -> Result<u64, String> {
    let expired_covers = sqlx::query_as::<_, (String,)>(
        "SELECT DISTINCT cover FROM article_pushes \
         WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now', '+8 hours')",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| error.to_string())?;

    let result = sqlx::query(
        "DELETE FROM article_pushes \
         WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now', '+8 hours')",
    )
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    for (cover,) in &expired_covers {
        remove_local_cover_if_unshared(pool, cover).await;
    }

    Ok(result.rows_affected())
}

pub async fn article_push_cleanup_daemon(pool: SqlitePool) {
    loop {
        if let Ok(deleted_count) = cleanup_expired_article_pushes(&pool).await {
            if deleted_count > 0 {
                println!("[Article PUSH] 已清理 {deleted_count} 条过期活动 PUSH");
            }
        }
        sleep(Duration::from_secs(60)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::{article_push_content_has_body, sanitize_article_push_html};

    #[test]
    fn article_push_html_keeps_rich_media_and_removes_scripts() {
        let html = r#"
            <p class="ql-align-center" style="font-size: 24px; color: red; position: fixed" onclick="alert(1)">
                <strong>活动开始</strong>
            </p>
            <img src="/uploads/admin/banner.webp" onerror="alert(1)">
            <iframe class="ql-video" src="https://example.com/embed/1" onload="alert(1)"></iframe>
            <script>alert(1)</script>
        "#;

        let sanitized = sanitize_article_push_html(html);

        assert!(sanitized.contains("ql-align-center"));
        assert!(sanitized.contains("font-size:24px"));
        assert!(sanitized.contains("color:red"));
        assert!(sanitized.contains("<img"));
        assert!(sanitized.contains("<iframe"));
        assert!(
            sanitized.contains("sandbox=\"allow-scripts allow-same-origin allow-presentation\"")
        );
        assert!(!sanitized.contains("position"));
        assert!(!sanitized.contains("onclick"));
        assert!(!sanitized.contains("onerror"));
        assert!(!sanitized.contains("<script"));
    }

    #[test]
    fn article_push_html_blank_quill_document_is_empty() {
        assert!(!article_push_content_has_body("<p><br></p>"));
        assert!(article_push_content_has_body(
            "<p><strong>hello</strong></p>"
        ));
        assert!(article_push_content_has_body(
            r#"<img src="/uploads/admin/a.webp">"#
        ));
    }
}

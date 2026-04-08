// backend/src/handlers/minecraft_api.rs
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use scraper::{Html, Selector};
use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
use tokio::time::{Duration, sleep};

use crate::models::{Claims, McCrawlerConfig, McUpdate, UpdateMcCrawlerConfig};

#[derive(Deserialize, Default)]
pub struct McUpdatesQuery {
    #[serde(default, alias = "q")]
    pub search: Option<String>,
    #[serde(default, rename = "type", alias = "vType")]
    pub v_type: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub offset: Option<i64>,
}

async fn record_public_update_request(pool: &SqlitePool) {
    sqlx::query("UPDATE mc_crawler_config SET request_count = request_count + 1 WHERE id = '1'")
        .execute(pool)
        .await
        .ok();
}

async fn query_cached_updates(
    pool: &SqlitePool,
    query: &McUpdatesQuery,
    default_limit: Option<i64>,
    max_limit: i64,
) -> Result<Vec<McUpdate>, (StatusCode, String)> {
    let mut builder = QueryBuilder::<Sqlite>::new(
        "SELECT version, v_type, title, cover, article, wiki_en, wiki_zh, date, created_at \
         FROM mc_updates WHERE 1 = 1",
    );

    if let Some(version) = query
        .version
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        builder.push(" AND version = ").push_bind(version);
    }

    if let Some(v_type) = query
        .v_type
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        builder.push(" AND v_type = ").push_bind(v_type);
    }

    if let Some(search) = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let search_like = format!("%{}%", search);
        builder
            .push(" AND (version LIKE ")
            .push_bind(search_like.clone())
            .push(" OR title LIKE ")
            .push_bind(search_like)
            .push(")");
    }

    builder.push(" ORDER BY date DESC, datetime(created_at) DESC");

    let safe_limit = query
        .limit
        .or(default_limit)
        .map(|value| value.clamp(1, max_limit));
    let safe_offset = query.offset.unwrap_or(0).max(0);

    if let Some(limit) = safe_limit {
        builder.push(" LIMIT ").push_bind(limit);
    } else if safe_offset > 0 {
        builder.push(" LIMIT -1");
    }

    if safe_offset > 0 {
        builder.push(" OFFSET ").push_bind(safe_offset);
    }

    builder
        .build_query_as::<McUpdate>()
        .fetch_all(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

// ==========================================
// 1. 前端/客户端 公开接口 (极速响应)
// ==========================================

// 客户端请求：记录次数，并直接从数据库拉取最新的一条缓存
pub async fn get_latest_update(
    State(pool): State<SqlitePool>,
) -> Result<Json<McUpdate>, (StatusCode, String)> {
    // 1. 客户端请求次数 +1
    record_public_update_request(&pool).await;

    // 2. 直接从数据库拉取最新的一条 (按日期或创建时间降序)
    let latest = sqlx::query_as::<_, McUpdate>(
        "SELECT * FROM mc_updates ORDER BY date DESC, created_at DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match latest {
        Some(update) => Ok(Json(update)),
        None => Err((
            StatusCode::NOT_FOUND,
            "缓存为空，爬虫可能还未完成首次抓取".to_string(),
        )),
    }
}

// ==========================================
// 2. 后台管理接口 (Admin)
// ==========================================

// Public cached MC updates for clients.
pub async fn get_public_updates(
    Query(query): Query<McUpdatesQuery>,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<McUpdate>>, (StatusCode, String)> {
    record_public_update_request(&pool).await;
    let updates = query_cached_updates(&pool, &query, Some(20), 100).await?;
    Ok(Json(updates))
}

pub async fn get_crawler_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Json<McCrawlerConfig> {
    let config =
        sqlx::query_as::<_, McCrawlerConfig>("SELECT * FROM mc_crawler_config WHERE id = '1'")
            .fetch_one(&pool)
            .await
            .unwrap();
    Json(config)
}

pub async fn update_crawler_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<UpdateMcCrawlerConfig>,
) -> Result<StatusCode, (StatusCode, String)> {
    // 限制最小抓取间隔为 5 分钟，防止被 Mojang 拉黑
    let safe_interval = std::cmp::max(5, payload.interval_minutes);
    sqlx::query("UPDATE mc_crawler_config SET interval_minutes = ? WHERE id = '1'")
        .bind(safe_interval)
        .execute(&pool)
        .await
        .unwrap();
    Ok(StatusCode::OK)
}

// 获取缓存的历史卡片列表
pub async fn get_cached_updates(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Json<Vec<McUpdate>> {
    let updates = sqlx::query_as::<_, McUpdate>("SELECT * FROM mc_updates ORDER BY date DESC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();
    Json(updates)
}

// 手动强制触发一次抓取
pub async fn force_crawl(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<StatusCode, (StatusCode, String)> {
    match perform_crawl(&pool).await {
        Ok(_) => Ok(StatusCode::OK),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    }
}

// ==========================================
// 3. 后台守护进程 (Daemon)
// ==========================================

pub async fn crawler_daemon(pool: SqlitePool) {
    loop {
        // 每隔 60 秒醒来一次，检查是否需要执行抓取
        sleep(Duration::from_secs(60)).await;

        let config: Result<McCrawlerConfig, _> =
            sqlx::query_as("SELECT * FROM mc_crawler_config WHERE id = '1'")
                .fetch_one(&pool)
                .await;

        if let Ok(cfg) = config {
            let should_crawl = match cfg.last_crawl_time {
                None => true, // 从未抓取过
                Some(last_time_str) => {
                    // 粗略判断：利用 SQLite 的时间差计算
                    let check_query = "SELECT (julianday('now') - julianday(?)) * 24 * 60 >= ?";
                    let is_due: (bool,) = sqlx::query_as(check_query)
                        .bind(last_time_str)
                        .bind(cfg.interval_minutes)
                        .fetch_one(&pool)
                        .await
                        .unwrap_or((true,));
                    is_due.0
                }
            };

            if should_crawl {
                println!("🤖 [MC爬虫] 触发定时抓取...");
                let _ = perform_crawl(&pool).await;
            }
        }
    }
}

// ==========================================
// 4. 核心抓取引擎 (入库 + 4个月清理)
// ==========================================

#[derive(Deserialize)]
struct MojangManifest {
    versions: Vec<VersionInfo>,
}
#[derive(Deserialize)]
struct VersionInfo {
    id: String,
    #[serde(rename = "type")]
    v_type: String,
}
#[derive(Deserialize)]
struct JsonLdSchema {
    headline: Option<String>,
    image: Option<Vec<String>>,
    #[serde(rename = "datePublished")]
    date_published: Option<String>,
}

async fn perform_crawl(pool: &SqlitePool) -> Result<(), String> {
    // 1. 获取 Mojang 最新清单
    let manifest: MojangManifest =
        reqwest::get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json")
            .await
            .map_err(|e| format!("请求清单失败: {}", e))?
            .json()
            .await
            .map_err(|e| format!("解析清单失败: {}", e))?;

    let latest = manifest.versions.first().ok_or("清单为空")?;
    let v_id = &latest.id;
    let v_type = &latest.v_type;

    // 2. 检查数据库是否已经存在此版本 (防重复抓取)
    let exists: (bool,) =
        sqlx::query_as("SELECT EXISTS(SELECT 1 FROM mc_updates WHERE version = ?)")
            .bind(v_id)
            .fetch_one(pool)
            .await
            .unwrap_or((false,));

    if !exists.0 {
        // 执行重度网页抓取
        let (article_url, wiki_en, wiki_zh) = build_urls(v_id, v_type);
        let html = reqwest::get(&article_url)
            .await
            .map_err(|e| e.to_string())?
            .text()
            .await
            .unwrap_or_default();

        let schema_data = {
            let document = Html::parse_document(&html);
            let selector = Selector::parse(r#"script[type="application/ld+json"]"#).unwrap();
            let mut extracted = None;
            for el in document.select(&selector) {
                let inner = el.inner_html();
                if inner.contains("NewsArticle") {
                    if let Ok(parsed) = serde_json::from_str::<JsonLdSchema>(&inner) {
                        extracted = Some(parsed);
                        break;
                    }
                }
            }
            extracted
        };

        if let Some(schema) = schema_data {
            let title = format!(
                "{} 更新日志",
                schema.headline.unwrap_or(format!("Minecraft {}", v_id))
            );
            let date = schema
                .date_published
                .unwrap_or_default()
                .split('T')
                .next()
                .unwrap_or("")
                .to_string();
            let source_image = schema
                .image
                .and_then(|imgs| imgs.into_iter().next())
                .unwrap_or_default();

            // 图片下载缓存
            let file_name = format!("{}_cover.jpg", v_id);
            let file_path = format!("./uploads/mc_covers/{}", file_name);
            let local_cover_url = format!("/uploads/mc_covers/{}", file_name);

            if !Path::new(&file_path).exists() && !source_image.is_empty() {
                tokio::fs::create_dir_all("./uploads/mc_covers").await.ok();
                if let Ok(resp) = reqwest::get(&source_image).await {
                    if let Ok(bytes) = resp.bytes().await {
                        tokio::fs::write(&file_path, bytes).await.ok();
                    }
                }
            }

            // 写入数据库
            sqlx::query("INSERT INTO mc_updates (version, v_type, title, cover, article, wiki_en, wiki_zh, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(v_id).bind(v_type).bind(title).bind(local_cover_url).bind(article_url).bind(wiki_en).bind(wiki_zh).bind(date)
                .execute(pool).await.map_err(|e| e.to_string())?;
        }
    }

    // 3. 记录爬虫状态 (更新最后成功时间)
    sqlx::query("UPDATE mc_crawler_config SET last_crawl_time = CURRENT_TIMESTAMP, last_crawl_status = '抓取成功' WHERE id = '1'")
        .execute(pool).await.ok();

    // 4. 清理旧数据 (仅保留最近 4 个月的数据)
    sqlx::query("DELETE FROM mc_updates WHERE created_at < datetime('now', '-4 months')")
        .execute(pool)
        .await
        .ok();

    Ok(())
}

// 智能 URL 引擎保持不变
fn build_urls(version_id: &str, v_type: &str) -> (String, String, String) {
    let base_url = "https://www.minecraft.net/en-us/article";
    let wiki_en_base = "https://minecraft.wiki/w/Java_Edition";
    let wiki_zh_base = "https://zh.minecraft.wiki/w/Java%E7%89%88";

    if v_type == "release" && !version_id.contains('-') {
        let article_id = format!("minecraft-java-edition-{}", version_id.replace('.', "-"));
        return (
            format!("{}/{}", base_url, article_id),
            format!("{}_{}", wiki_en_base, version_id),
            format!("{}{}", wiki_zh_base, version_id),
        );
    }
    if version_id.contains('w') && !version_id.contains('-') {
        return (
            format!("{}/minecraft-snapshot-{}", base_url, version_id),
            format!("{}_{}", wiki_en_base, version_id),
            format!("{}{}", wiki_zh_base, version_id),
        );
    }

    let parts: Vec<&str> = version_id.splitn(2, '-').collect();
    let base_version = parts[0];
    let suffix = if parts.len() > 1 { parts[1] } else { "" };

    let (article_suffix, en_wiki_suffix, zh_wiki_suffix) = if suffix.starts_with("snapshot") {
        let num = suffix.replace("snapshot-", "");
        (
            format!("snapshot-{}", num),
            format!("Snapshot_{}", num),
            format!("snapshot-{}", num),
        )
    } else if suffix.starts_with("pre") {
        let num = suffix.replace("pre", "").replace("-", "");
        (
            format!("pre-release-{}", num),
            format!("Pre-Release_{}", num),
            format!("pre{}", num),
        )
    } else if suffix.starts_with("rc") {
        let num = suffix.replace("rc", "").replace("-", "");
        (
            format!("release-candidate-{}", num),
            format!("Release_Candidate_{}", num),
            format!("rc{}", num),
        )
    } else {
        (suffix.to_string(), suffix.to_string(), suffix.to_string())
    };

    (
        format!(
            "{}/minecraft-{}-{}",
            base_url,
            base_version.replace('.', "-"),
            article_suffix
        ),
        format!("{}_{}_{}", wiki_en_base, base_version, en_wiki_suffix),
        format!("{}{}-{}", wiki_zh_base, base_version, zh_wiki_suffix),
    )
}

// ==========================================
// 5. Version Manifest Daemon & Search API
// ==========================================

#[derive(Deserialize)]
struct VersionManifestV2 {
    versions: Vec<ManifestVersion>,
}

#[derive(Deserialize)]
struct ManifestVersion {
    id: String,
    #[serde(rename = "type")]
    v_type: String,
    #[serde(rename = "releaseTime")]
    release_time: String,
}

pub async fn version_manifest_daemon(pool: SqlitePool) {
    loop {
        let _ = perform_manifest_sync(&pool).await;
        // 每 24 小时更新一次
        sleep(Duration::from_secs(24 * 3600)).await;
    }
}

pub async fn perform_manifest_sync(pool: &SqlitePool) -> Result<(), String> {
    if let Ok(resp) = reqwest::get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").await {
        if let Ok(manifest) = resp.json::<VersionManifestV2>().await {
            // 使用事务保证数据一致性
            if let Ok(mut tx) = pool.begin().await {
                let _ = sqlx::query("DELETE FROM mc_version_manifest").execute(&mut *tx).await;
                for v in manifest.versions {
                    let _ = sqlx::query("INSERT INTO mc_version_manifest (id, v_type, release_time) VALUES (?, ?, ?)")
                        .bind(v.id)
                        .bind(v.v_type)
                        .bind(v.release_time)
                        .execute(&mut *tx)
                        .await;
                }
                let _ = tx.commit().await;
            }
            return Ok(());
        }
    }
    Err("Failed to sync version manifest".to_string())
}

pub async fn force_sync_version_manifest(
    _claims: crate::models::Claims,
    State(pool): State<SqlitePool>,
) -> Result<StatusCode, (StatusCode, String)> {
    match perform_manifest_sync(&pool).await {
        Ok(_) => Ok(StatusCode::OK),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e)),
    }
}

pub async fn get_mc_versions(
    Query(params): Query<HashMap<String, String>>,
    State(pool): State<SqlitePool>,
) -> Json<Vec<crate::models::McVersionManifest>> {
    let q = params.get("search").map(|s| s.as_str()).unwrap_or("");
    let versions = sqlx::query_as::<_, crate::models::McVersionManifest>(
        "SELECT * FROM mc_version_manifest WHERE id LIKE ? OR v_type LIKE ? ORDER BY release_time DESC LIMIT 100",
    )
    .bind(format!("%{}%", q))
    .bind(format!("%{}%", q))
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(versions)
}

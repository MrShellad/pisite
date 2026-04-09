use crate::models::{
    Claims, CreateServerSubmissionPayload, ServerPingBatchRunResult, ServerPingConfig, ServerStatus,
    ServerStatusHistory, ServerSubmission, ServerTagDictPayload, UpdateServerPingConfigPayload,
    UpdateServerSubmissionPayload,
};
use ammonia::clean;
use axum::{
    Json,
    extract::{Multipart, Path as AxumPath, Query, State},
    http::StatusCode,
};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use sqlx::{QueryBuilder, Sqlite, SqlitePool, types::Json as SqlxJson};
use std::{collections::HashSet, io, path::Path};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    time::{Duration, sleep, timeout},
};
use uuid::Uuid;

const STATUS_PROTOCOL_VERSION: i32 = 760;

static CONTACT_EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$").expect("valid contact email regex")
});

static FALLBACK_MC_VERSION_REGEXES: Lazy<[Regex; 5]> = Lazy::new(|| {
    [
        Regex::new(r"^\d+\.\d+(\.\d+)?$").expect("valid release regex"),
        Regex::new(r"^\d{2}w\d{2}[a-z]$").expect("valid snapshot regex"),
        Regex::new(r"^\d+\.\d+(\.\d+)?-(pre|pre-release)\d+$")
            .expect("valid pre-release regex"),
        Regex::new(r"^\d+\.\d+(\.\d+)?-rc\d+$").expect("valid rc regex"),
        Regex::new(r"^\d+\.\d+(\.\d+)?-snapshot-\d{2}w\d{2}[a-z]$")
            .expect("valid experimental snapshot regex"),
    ]
});

fn normalize_contact_email(raw: &str) -> Result<String, (StatusCode, String)> {
    let email = raw.trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Contact email is required".to_string()));
    }

    if !CONTACT_EMAIL_REGEX.is_match(&email) {
        return Err((StatusCode::BAD_REQUEST, "Invalid contact email".to_string()));
    }

    Ok(email)
}

fn sanitize_versions(raw_versions: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut versions = Vec::new();

    for version in raw_versions
        .iter()
        .map(|item| item.trim().to_lowercase())
        .filter(|item| !item.is_empty())
    {
        if seen.insert(version.clone()) {
            versions.push(version);
        }
    }

    versions
}

async fn validate_mc_versions(
    pool: &SqlitePool,
    raw_versions: &[String],
) -> Result<Vec<String>, (StatusCode, String)> {
    let versions = sanitize_versions(raw_versions);
    if versions.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "At least one MC version is required".to_string(),
        ));
    }

    let manifest_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM mc_version_manifest")
        .fetch_one(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if manifest_count.0 > 0 {
        let mut builder = QueryBuilder::<Sqlite>::new("SELECT id FROM mc_version_manifest WHERE id IN (");
        let mut separated = builder.separated(", ");
        for version in &versions {
            separated.push_bind(version);
        }
        separated.push_unseparated(")");

        let existing = builder
            .build_query_as::<(String,)>()
            .fetch_all(pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let existing_ids: HashSet<String> = existing.into_iter().map(|(id,)| id).collect();

        let invalid_versions: Vec<String> = versions
            .iter()
            .filter(|version| !existing_ids.contains((*version).as_str()))
            .cloned()
            .collect();

        if invalid_versions.is_empty() {
            return Ok(versions);
        }

        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid MC version(s): {}", invalid_versions.join(", ")),
        ));
    }

    let invalid_versions: Vec<String> = versions
        .iter()
        .filter(|version| {
            !FALLBACK_MC_VERSION_REGEXES
                .iter()
                .any(|regex| regex.is_match(version))
        })
        .cloned()
        .collect();

    if invalid_versions.is_empty() {
        Ok(versions)
    } else {
        Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid MC version format: {}", invalid_versions.join(", ")),
        ))
    }
}

fn validate_server_submission_fields(
    name: &str,
    ip: &str,
    icon: &str,
    hero: &str,
    port: i32,
    max_players: i32,
    server_type: &str,
    modpack_url: &str,
    has_voice_chat: bool,
    voice_url: &str,
    age_recommendation: &str,
) -> Result<(), (StatusCode, String)> {
    if name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Server name is required".to_string()));
    }
    if ip.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Server IP is required".to_string()));
    }
    if icon.trim().is_empty() || hero.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Icon and hero image are required".to_string(),
        ));
    }
    if !(1..=65_535).contains(&port) {
        return Err((StatusCode::BAD_REQUEST, "Invalid server port".to_string()));
    }
    if max_players <= 0 {
        return Err((StatusCode::BAD_REQUEST, "Max players must be positive".to_string()));
    }
    if server_type == "modded" && modpack_url.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Modded servers must provide a modpack URL".to_string(),
        ));
    }
    if has_voice_chat && voice_url.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Voice URL is required when voice chat is enabled".to_string(),
        ));
    }

    let valid_ages = ["全年龄", "12+", "16+", "18+"];
    if !valid_ages.contains(&age_recommendation) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid age recommendation".to_string(),
        ));
    }

    Ok(())
}

fn server_submission_select_sql(only_verified: bool) -> &'static str {
    if only_verified {
        "SELECT s.*, \
            st.online_players AS status_online_players, \
            st.max_players AS status_max_players, \
            st.is_online AS status_is_online, \
            st.updated_at AS status_updated_at, \
            st.expires_at AS status_expires_at, \
            CASE \
                WHEN st.expires_at IS NULL THEN 1 \
                WHEN datetime(st.expires_at) <= datetime('now') THEN 1 \
                ELSE 0 \
            END AS status_is_expired \
        FROM server_submissions s \
        LEFT JOIN server_status st ON st.server_id = s.id \
        WHERE s.verified = 1 \
        ORDER BY datetime(s.created_at) DESC"
    } else {
        "SELECT s.*, \
            st.online_players AS status_online_players, \
            st.max_players AS status_max_players, \
            st.is_online AS status_is_online, \
            st.updated_at AS status_updated_at, \
            st.expires_at AS status_expires_at, \
            CASE \
                WHEN st.expires_at IS NULL THEN 1 \
                WHEN datetime(st.expires_at) <= datetime('now') THEN 1 \
                ELSE 0 \
            END AS status_is_expired \
        FROM server_submissions s \
        LEFT JOIN server_status st ON st.server_id = s.id \
        ORDER BY datetime(s.created_at) DESC"
    }
}

pub async fn upload_server_cover(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    else {
        return Err((StatusCode::BAD_REQUEST, "No file uploaded".to_string()));
    };

    let original_name = field.file_name().unwrap_or("cover.png");
    let ext = Path::new(original_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("png");
    let file_name = format!("{}.{}", Uuid::new_v4(), ext);
    let relative_path = format!("./uploads/server_covers/{}", file_name);

    tokio::fs::create_dir_all("./uploads/server_covers")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let data = field
        .bytes()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tokio::fs::write(&relative_path, data)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "url": format!("/uploads/server_covers/{}", file_name)
    })))
}

pub async fn create_server_submission(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateServerSubmissionPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let safe_description = clean(&payload.description);
    let safe_name = clean(&payload.name).trim().to_string();
    let safe_ip = payload.ip.trim().to_string();
    let safe_contact_email = normalize_contact_email(&payload.contact_email)?;
    let safe_versions = validate_mc_versions(&pool, &payload.versions).await?;
    validate_server_submission_fields(
        &safe_name,
        &safe_ip,
        &payload.icon,
        &payload.hero,
        payload.port,
        payload.max_players,
        payload.server_type.trim(),
        &payload.modpack_url,
        payload.has_voice_chat,
        &payload.voice_url,
        &payload.age_recommendation,
    )?;

    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO server_submissions (
            id, name, description, ip, port, versions, max_players, online_players,
            icon, hero, contact_email, website, server_type, language, modpack_url,
            has_paid_content, age_recommendation,
            social_links, has_voice_chat, voice_platform, voice_url,
            features, mechanics, elements, community, tags, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
    )
    .bind(&id)
    .bind(safe_name)
    .bind(safe_description)
    .bind(safe_ip)
    .bind(payload.port)
    .bind(SqlxJson(&safe_versions))
    .bind(payload.max_players)
    .bind(payload.online_players)
    .bind(payload.icon.trim())
    .bind(payload.hero.trim())
    .bind(&safe_contact_email)
    .bind(payload.website.trim())
    .bind(payload.server_type.trim())
    .bind(payload.language.trim())
    .bind(payload.modpack_url.trim())
    .bind(payload.has_paid_content)
    .bind(&payload.age_recommendation)
    .bind(SqlxJson(&payload.social_links))
    .bind(payload.has_voice_chat)
    .bind(payload.voice_platform.trim())
    .bind(payload.voice_url.trim())
    .bind(SqlxJson(&payload.features))
    .bind(SqlxJson(&payload.mechanics))
    .bind(SqlxJson(&payload.elements))
    .bind(SqlxJson(&payload.community))
    .bind(SqlxJson(&payload.tags))
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        serde_json::json!({ "id": id, "message": "submitted successfully" }),
    ))
}

pub async fn get_all_server_submissions(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerSubmission>>, (StatusCode, String)> {
    let submissions = sqlx::query_as::<_, ServerSubmission>(server_submission_select_sql(false))
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(submissions))
}

pub async fn get_public_server_submissions(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerSubmission>>, (StatusCode, String)> {
    let submissions = sqlx::query_as::<_, ServerSubmission>(server_submission_select_sql(true))
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(submissions))
}

pub async fn get_public_server_statuses(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerStatus>>, (StatusCode, String)> {
    let statuses = sqlx::query_as::<_, ServerStatus>(
        "SELECT
            st.server_id,
            st.online_players,
            st.max_players,
            CASE
                WHEN st.expires_at IS NOT NULL AND datetime(st.expires_at) <= datetime('now') THEN 0
                ELSE st.is_online
            END AS is_online,
            st.updated_at,
            st.expires_at
         FROM server_status st
         INNER JOIN server_submissions s ON s.id = st.server_id
         WHERE s.verified = 1
         ORDER BY datetime(st.updated_at) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(statuses))
}

pub async fn update_server_submission(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<UpdateServerSubmissionPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let safe_name = clean(&payload.name).trim().to_string();
    let safe_description = clean(&payload.description);
    let safe_ip = payload.ip.trim().to_string();
    let safe_contact_email = normalize_contact_email(&payload.contact_email)?;
    let safe_versions = validate_mc_versions(&pool, &payload.versions).await?;

    validate_server_submission_fields(
        &safe_name,
        &safe_ip,
        &payload.icon,
        &payload.hero,
        payload.port,
        payload.max_players,
        payload.server_type.trim(),
        &payload.modpack_url,
        payload.has_voice_chat,
        &payload.voice_url,
        &payload.age_recommendation,
    )?;

    let result = sqlx::query(
        "UPDATE server_submissions
         SET name = ?, description = ?, ip = ?, port = ?, versions = ?, max_players = ?, online_players = ?,
             icon = ?, hero = ?, contact_email = ?, website = ?, server_type = ?, language = ?, modpack_url = ?,
             has_paid_content = ?, age_recommendation = ?,
             social_links = ?, has_voice_chat = ?, voice_platform = ?, voice_url = ?,
             features = ?, mechanics = ?, elements = ?, community = ?, tags = ?, verified = ?
         WHERE id = ?",
    )
    .bind(&safe_name)
    .bind(safe_description)
    .bind(&safe_ip)
    .bind(payload.port)
    .bind(SqlxJson(&safe_versions))
    .bind(payload.max_players)
    .bind(payload.online_players)
    .bind(payload.icon.trim())
    .bind(payload.hero.trim())
    .bind(&safe_contact_email)
    .bind(payload.website.trim())
    .bind(payload.server_type.trim())
    .bind(payload.language.trim())
    .bind(payload.modpack_url.trim())
    .bind(payload.has_paid_content)
    .bind(&payload.age_recommendation)
    .bind(SqlxJson(&payload.social_links))
    .bind(payload.has_voice_chat)
    .bind(payload.voice_platform.trim())
    .bind(payload.voice_url.trim())
    .bind(SqlxJson(&payload.features))
    .bind(SqlxJson(&payload.mechanics))
    .bind(SqlxJson(&payload.elements))
    .bind(SqlxJson(&payload.community))
    .bind(SqlxJson(&payload.tags))
    .bind(payload.verified)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }

    Ok(StatusCode::OK)
}

pub async fn toggle_verify(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("UPDATE server_submissions SET verified = NOT verified WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }

    Ok(StatusCode::OK)
}

pub async fn get_server_tags_dict(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<crate::models::ServerTagDict>>, (StatusCode, String)> {
    let dict = sqlx::query_as::<_, crate::models::ServerTagDict>(
        "SELECT * FROM server_tags_dict ORDER BY priority ASC, id ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(dict))
}

pub async fn delete_server_submission(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM server_submissions WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }
    Ok(StatusCode::OK)
}

pub async fn create_server_tag_dict(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<ServerTagDictPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO server_tags_dict (id, category, label, icon_svg, color, priority)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(payload.category.trim())
    .bind(clean(&payload.label).trim())
    .bind(payload.icon_svg.trim())
    .bind(payload.color.trim())
    .bind(payload.priority)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::CREATED)
}

pub async fn update_server_tag_dict(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<ServerTagDictPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        "UPDATE server_tags_dict
         SET category = ?, label = ?, icon_svg = ?, color = ?, priority = ?
         WHERE id = ?",
    )
    .bind(payload.category.trim())
    .bind(clean(&payload.label).trim())
    .bind(payload.icon_svg.trim())
    .bind(payload.color.trim())
    .bind(payload.priority)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Tag not found".to_string()));
    }
    Ok(StatusCode::OK)
}

pub async fn delete_server_tag_dict(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM server_tags_dict WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Tag not found".to_string()));
    }
    Ok(StatusCode::OK)
}

pub async fn get_server_statuses(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerStatus>>, (StatusCode, String)> {
    let statuses = sqlx::query_as::<_, ServerStatus>(
        "SELECT server_id, online_players, max_players, is_online, updated_at, expires_at
         FROM server_status
         ORDER BY datetime(updated_at) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(statuses))
}

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
}

pub async fn get_server_status_history(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(server_id): AxumPath<String>,
    Query(query): Query<HistoryQuery>,
) -> Result<Json<Vec<ServerStatusHistory>>, (StatusCode, String)> {
    let safe_limit = query.limit.unwrap_or(120).clamp(1, 2000);

    let history = sqlx::query_as::<_, ServerStatusHistory>(
        "SELECT id, server_id, online_players, max_players, is_online, recorded_at
         FROM server_status_history
         WHERE server_id = ?
         ORDER BY datetime(recorded_at) DESC
         LIMIT ?",
    )
    .bind(server_id)
    .bind(safe_limit)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(history))
}

pub async fn get_server_ping_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<ServerPingConfig>, (StatusCode, String)> {
    let config = sqlx::query_as::<_, ServerPingConfig>(
        "SELECT id, enabled, interval_seconds, batch_size, timeout_ms, ttl_seconds, cursor, last_run_at, last_run_status
         FROM server_ping_config
         WHERE id = '1'",
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(config))
}

pub async fn update_server_ping_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<UpdateServerPingConfigPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let safe_interval_seconds = payload.interval_seconds.clamp(10, 86_400);
    let safe_batch_size = payload.batch_size.clamp(1, 200);
    let safe_timeout_ms = payload.timeout_ms.clamp(500, 15_000);
    let safe_ttl_seconds = payload.ttl_seconds.clamp(10, 86_400);

    sqlx::query(
        "UPDATE server_ping_config
         SET enabled = ?, interval_seconds = ?, batch_size = ?, timeout_ms = ?, ttl_seconds = ?
         WHERE id = '1'",
    )
    .bind(payload.enabled)
    .bind(safe_interval_seconds)
    .bind(safe_batch_size)
    .bind(safe_timeout_ms)
    .bind(safe_ttl_seconds)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

pub async fn run_server_ping_batch_now(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<ServerPingBatchRunResult>, (StatusCode, String)> {
    let result = run_server_ping_batch(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(result))
}

#[derive(sqlx::FromRow)]
struct PingTarget {
    id: String,
    ip: String,
    port: i32,
}

pub async fn server_status_daemon(pool: SqlitePool) {
    loop {
        sleep(Duration::from_secs(10)).await;

        let should_run = sqlx::query_as::<_, (bool,)>(
            "SELECT CASE
                WHEN enabled = 0 THEN 0
                WHEN last_run_at IS NULL THEN 1
                ELSE (julianday('now') - julianday(last_run_at)) * 86400 >= interval_seconds
            END
            FROM server_ping_config
            WHERE id = '1'",
        )
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
        .map(|row| row.0)
        .unwrap_or(false);

        if !should_run {
            continue;
        }

        if let Err(err) = run_server_ping_batch(&pool).await {
            let _ = sqlx::query(
                "UPDATE server_ping_config
                 SET last_run_at = CURRENT_TIMESTAMP, last_run_status = ?
                 WHERE id = '1'",
            )
            .bind(format!("error: {}", err))
            .execute(&pool)
            .await;
        }
    }
}

pub async fn run_server_ping_batch(pool: &SqlitePool) -> Result<ServerPingBatchRunResult, String> {
    let cfg = sqlx::query_as::<_, ServerPingConfig>(
        "SELECT id, enabled, interval_seconds, batch_size, timeout_ms, ttl_seconds, cursor, last_run_at, last_run_status
         FROM server_ping_config
         WHERE id = '1'",
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let total_servers: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM server_submissions WHERE verified = 1")
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

    if total_servers.0 == 0 {
        sqlx::query(
            "UPDATE server_ping_config
             SET cursor = 0, last_run_at = CURRENT_TIMESTAMP, last_run_status = 'no verified servers'
             WHERE id = '1'",
        )
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        return Ok(ServerPingBatchRunResult {
            total_servers: 0,
            processed_servers: 0,
            cursor: 0,
        });
    }

    let normalized_cursor = cfg.cursor.rem_euclid(total_servers.0);
    let mut targets = sqlx::query_as::<_, PingTarget>(
        "SELECT id, ip, port
         FROM server_submissions
         WHERE verified = 1
         ORDER BY id ASC
         LIMIT ? OFFSET ?",
    )
    .bind(cfg.batch_size)
    .bind(normalized_cursor)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let batch_remaining = (cfg.batch_size as i64 - targets.len() as i64).max(0);
    let unique_remaining = (total_servers.0 - targets.len() as i64).max(0);
    let wrap_count = batch_remaining.min(unique_remaining);

    if wrap_count > 0 {
        let mut wrap_targets = sqlx::query_as::<_, PingTarget>(
            "SELECT id, ip, port
             FROM server_submissions
             WHERE verified = 1
             ORDER BY id ASC
             LIMIT ? OFFSET 0",
        )
        .bind(wrap_count)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
        targets.append(&mut wrap_targets);
    }

    let mut processed = 0_i64;

    for target in &targets {
        let ping_result = ping_server_status(&target.ip, target.port, cfg.timeout_ms).await;
        let (online_players, max_players, is_online) = match ping_result {
            Ok((online, max)) => (online, max, true),
            Err(_) => (0, 0, false),
        };

        sqlx::query(
            "INSERT INTO server_status (server_id, online_players, max_players, is_online, updated_at, expires_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, datetime('now', '+' || ? || ' seconds'))
             ON CONFLICT(server_id) DO UPDATE SET
               online_players = excluded.online_players,
               max_players = excluded.max_players,
               is_online = excluded.is_online,
               updated_at = CURRENT_TIMESTAMP,
               expires_at = datetime('now', '+' || ? || ' seconds')",
        )
        .bind(&target.id)
        .bind(online_players)
        .bind(max_players)
        .bind(is_online)
        .bind(cfg.ttl_seconds)
        .bind(cfg.ttl_seconds)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO server_status_history (server_id, online_players, max_players, is_online, recorded_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
        )
        .bind(&target.id)
        .bind(online_players)
        .bind(max_players)
        .bind(is_online)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

        processed += 1;
    }

    let new_cursor = (normalized_cursor + processed).rem_euclid(total_servers.0);

    sqlx::query(
        "UPDATE server_ping_config
         SET cursor = ?, last_run_at = CURRENT_TIMESTAMP, last_run_status = ?
         WHERE id = '1'",
    )
    .bind(new_cursor)
    .bind(format!("ok: {}/{}", processed, total_servers.0))
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM server_status_history WHERE recorded_at < datetime('now', '-30 days')")
        .execute(pool)
        .await
        .ok();

    Ok(ServerPingBatchRunResult {
        total_servers: total_servers.0,
        processed_servers: processed,
        cursor: new_cursor,
    })
}

#[derive(Deserialize)]
struct SlpResponse {
    players: Option<SlpPlayers>,
}

#[derive(Deserialize)]
struct SlpPlayers {
    online: Option<i32>,
    max: Option<i32>,
}

async fn ping_server_status(ip: &str, port: i32, timeout_ms: i32) -> Result<(i32, i32), String> {
    if !(1..=65_535).contains(&port) {
        return Err("invalid port".to_string());
    }

    let host = ip.trim();
    if host.is_empty() {
        return Err("empty host".to_string());
    }

    let timeout_duration = Duration::from_millis(timeout_ms.max(500) as u64);
    let connect_addr = format!("{}:{}", host, port);

    timeout(timeout_duration, async {
        let mut stream = TcpStream::connect(&connect_addr)
            .await
            .map_err(|e| format!("connect failed: {}", e))?;

        let mut handshake_payload = Vec::new();
        write_varint(&mut handshake_payload, 0);
        write_varint(&mut handshake_payload, STATUS_PROTOCOL_VERSION);
        write_mc_string(&mut handshake_payload, host)?;
        handshake_payload.extend_from_slice(&(port as u16).to_be_bytes());
        write_varint(&mut handshake_payload, 1);

        let mut handshake_packet = Vec::new();
        write_varint(&mut handshake_packet, handshake_payload.len() as i32);
        handshake_packet.extend_from_slice(&handshake_payload);

        stream
            .write_all(&handshake_packet)
            .await
            .map_err(|e| format!("write handshake failed: {}", e))?;

        stream
            .write_all(&[0x01, 0x00])
            .await
            .map_err(|e| format!("write status request failed: {}", e))?;

        let _packet_length = read_varint(&mut stream).await?;
        let packet_id = read_varint(&mut stream).await?;
        if packet_id != 0 {
            return Err("unexpected packet id".to_string());
        }

        let json_len = read_varint(&mut stream).await?;
        if !(0..=65_535).contains(&json_len) {
            return Err("invalid json length".to_string());
        }

        let mut json_buf = vec![0_u8; json_len as usize];
        stream
            .read_exact(&mut json_buf)
            .await
            .map_err(|e| format!("read status payload failed: {}", e))?;

        let parsed: SlpResponse =
            serde_json::from_slice(&json_buf).map_err(|e| format!("parse status json failed: {}", e))?;

        let players = parsed
            .players
            .ok_or_else(|| "missing players field".to_string())?;

        Ok((players.online.unwrap_or(0), players.max.unwrap_or(0)))
    })
    .await
    .map_err(|_| "status ping timeout".to_string())?
}

fn write_mc_string(buffer: &mut Vec<u8>, text: &str) -> Result<(), String> {
    let bytes = text.as_bytes();
    if bytes.len() > 32_767 {
        return Err("host string too long".to_string());
    }
    write_varint(buffer, bytes.len() as i32);
    buffer.extend_from_slice(bytes);
    Ok(())
}

fn write_varint(buffer: &mut Vec<u8>, mut value: i32) {
    loop {
        if (value & !0x7F) == 0 {
            buffer.push(value as u8);
            return;
        }
        buffer.push(((value & 0x7F) | 0x80) as u8);
        value = ((value as u32) >> 7) as i32;
    }
}

async fn read_varint(stream: &mut TcpStream) -> Result<i32, String> {
    let mut result = 0_i32;

    for num_read in 0..5 {
        let mut read_buf = [0_u8; 1];
        stream
            .read_exact(&mut read_buf)
            .await
            .map_err(|e| format!("read varint failed: {}", e))?;

        let byte = read_buf[0];
        let value = (byte & 0x7F) as i32;
        result |= value << (7 * num_read);

        if (byte & 0x80) == 0 {
            return Ok(result);
        }
    }

    Err(io::Error::new(io::ErrorKind::InvalidData, "varint is too big").to_string())
}


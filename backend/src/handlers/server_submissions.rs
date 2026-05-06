use crate::handlers::image_storage::{MAX_SERVER_SUBMISSION_IMAGE_BYTES, uuid_webp_file_name};
use crate::handlers::submission_email::{
    check_submission_email_token, consume_submission_email_token, normalize_submission_email,
    send_submission_custom_email,
};
use crate::handlers::svg_sanitizer::sanitize_svg;
use crate::models::{
    Claims, CreateServerSubmissionPayload, IconTag, OwnerUpdateServerSubmissionPayload,
    SendSubmissionContactEmailPayload, ServerPingBatchRunResult, ServerPingConfig, ServerStatus,
    ServerStatusHistory, ServerSubmission, ServerSubmissionOwnerAuthPayload, ServerTagDict,
    ServerTagDictPayload, UpdateServerPingConfigPayload, UpdateServerSubmissionPayload,
};
use ammonia::clean;
use axum::{
    Json,
    extract::{Multipart, Path as AxumPath, Query, State},
    http::StatusCode,
};
use image::ImageFormat;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use sqlx::{QueryBuilder, Sqlite, SqlitePool, types::Json as SqlxJson};
use std::{collections::HashSet, io};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpStream,
    time::{Duration, sleep, timeout},
};
use uuid::Uuid;

const STATUS_PROTOCOL_VERSION: i32 = 760;

static FALLBACK_MC_VERSION_REGEXES: Lazy<[Regex; 5]> = Lazy::new(|| {
    [
        Regex::new(r"^\d+\.\d+(\.\d+)?$").expect("valid release regex"),
        Regex::new(r"^(?i)\d{2}w\d{2}[a-z_]+$").expect("valid snapshot regex"),
        Regex::new(r"^(?i)\d+\.\d+(\.\d+)?-(pre|pre-release)[-]?\d+$")
            .expect("valid pre-release regex"),
        Regex::new(r"^(?i)\d+\.\d+(\.\d+)?-rc[-]?\d+$").expect("valid rc regex"),
        Regex::new(r"^(?i)\d+\.\d+(\.\d+)?-snapshot-\d+$")
            .expect("valid experimental snapshot regex"),
    ]
});

fn hash_owner_token(email: &str, code: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(email.trim().to_lowercase().as_bytes());
    hasher.update(b":server-owner:");
    hasher.update(code.trim().as_bytes());
    format!("{:x}", hasher.finalize())
}

fn generate_owner_token() -> String {
    Uuid::new_v4()
        .simple()
        .to_string()
        .chars()
        .take(12)
        .collect::<String>()
        .to_uppercase()
}

fn sanitize_icon_tags(tags: &[IconTag]) -> Vec<IconTag> {
    tags.iter()
        .cloned()
        .map(|mut tag| {
            tag.label = clean(&tag.label).trim().to_string();
            tag.icon_svg = sanitize_svg(&tag.icon_svg);
            tag.color = tag.color.trim().to_string();
            tag
        })
        .collect()
}

fn sanitize_server_submission_tags(submission: &mut ServerSubmission) {
    submission.features = SqlxJson(sanitize_icon_tags(&submission.features.0));
    submission.mechanics = SqlxJson(sanitize_icon_tags(&submission.mechanics.0));
    submission.elements = SqlxJson(sanitize_icon_tags(&submission.elements.0));
    submission.community = SqlxJson(sanitize_icon_tags(&submission.community.0));
}

fn sanitize_server_tag_dict_items(dict: &mut [ServerTagDict]) {
    for item in dict {
        item.label = clean(&item.label).trim().to_string();
        item.icon_svg = sanitize_svg(&item.icon_svg);
        item.color = item.color.trim().to_string();
    }
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
        let mut builder =
            QueryBuilder::<Sqlite>::new("SELECT id FROM mc_version_manifest WHERE id IN (");
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
        return Err((
            StatusCode::BAD_REQUEST,
            "Server name is required".to_string(),
        ));
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
        return Err((
            StatusCode::BAD_REQUEST,
            "Max players must be positive".to_string(),
        ));
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
        WHERE s.verified = 1 AND COALESCE(s.owner_offline, 0) = 0 \
        ORDER BY s.sort_id ASC, datetime(s.created_at) DESC"
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
        ORDER BY s.sort_id ASC, datetime(s.created_at) DESC"
    }
}

fn server_submission_by_id_sql() -> &'static str {
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
     WHERE s.id = ?"
}

async fn verify_owner_access(
    pool: &SqlitePool,
    contact_email: &str,
    code: &str,
) -> Result<String, (StatusCode, String)> {
    let email = normalize_submission_email(contact_email)?;
    let clean_code = code.trim();
    if clean_code.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Owner code is required".to_string(),
        ));
    }

    let token_hash = hash_owner_token(&email, clean_code);
    let (id,): (String,) = sqlx::query_as(
        "SELECT id
         FROM server_submissions
         WHERE contact_email = ? AND owner_token_hash = ?
         LIMIT 1",
    )
    .bind(&email)
    .bind(&token_hash)
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((
        StatusCode::UNAUTHORIZED,
        "Email or owner code is invalid".to_string(),
    ))?;

    Ok(id)
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

    let file_name = uuid_webp_file_name();
    let relative_path = format!("./uploads/server_covers/{}", file_name);

    tokio::fs::create_dir_all("./uploads/server_covers")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let data = field
        .bytes()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if data.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "empty file".to_string()));
    }

    if data.len() > MAX_SERVER_SUBMISSION_IMAGE_BYTES {
        return Err((
            StatusCode::BAD_REQUEST,
            "Image file must be 1MB or smaller".to_string(),
        ));
    }

    let image_format = image::guess_format(&data)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid image file".to_string()))?;
    if image_format != ImageFormat::WebP {
        return Err((
            StatusCode::BAD_REQUEST,
            "Only WebP images are allowed".to_string(),
        ));
    }

    image::load_from_memory(&data).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("failed to decode image: {}", e),
        )
    })?;

    tokio::fs::write(&relative_path, &data)
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
    let safe_contact_email = normalize_submission_email(&payload.contact_email)?;
    let safe_versions = validate_mc_versions(&pool, &payload.versions).await?;
    let safe_features = sanitize_icon_tags(&payload.features);
    let safe_mechanics = sanitize_icon_tags(&payload.mechanics);
    let safe_elements = sanitize_icon_tags(&payload.elements);
    let safe_community = sanitize_icon_tags(&payload.community);
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
    let (email_verification_id, email_verified_at) = check_submission_email_token(
        &pool,
        &safe_contact_email,
        &payload.email_verification_token,
    )
    .await?;

    sqlx::query(
        "INSERT INTO server_submissions (
            id, name, description, ip, port, versions, max_players, online_players,
            icon, hero, contact_email, email_verified, email_verified_at, email_verification_id,
            website, server_type, language, modpack_url,
            has_paid_content, age_recommendation,
            social_links, has_voice_chat, voice_platform, voice_url,
            features, mechanics, elements, community, tags, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
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
    .bind(true)
    .bind(&email_verified_at)
    .bind(&email_verification_id)
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
    .bind(SqlxJson(&safe_features))
    .bind(SqlxJson(&safe_mechanics))
    .bind(SqlxJson(&safe_elements))
    .bind(SqlxJson(&safe_community))
    .bind(SqlxJson(&payload.tags))
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Now that the server_submission exists, we can safely consume the email verification token
    if let Err(err) = consume_submission_email_token(&pool, &email_verification_id, &id).await {
        // If consumption fails, rollback the server_submission
        let _ = sqlx::query("DELETE FROM server_submissions WHERE id = ?")
            .bind(&id)
            .execute(&pool)
            .await;
        return Err(err);
    }

    Ok(Json(
        serde_json::json!({ "id": id, "message": "submitted successfully" }),
    ))
}

pub async fn get_all_server_submissions(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerSubmission>>, (StatusCode, String)> {
    let mut submissions =
        sqlx::query_as::<_, ServerSubmission>(server_submission_select_sql(false))
            .fetch_all(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    for item in &mut submissions {
        sanitize_server_submission_tags(item);
    }

    Ok(Json(submissions))
}

pub async fn get_public_server_submissions(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerSubmission>>, (StatusCode, String)> {
    let mut submissions = sqlx::query_as::<_, ServerSubmission>(server_submission_select_sql(true))
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    for item in &mut submissions {
        item.email_verification_id = None;
        sanitize_server_submission_tags(item);
    }

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
         WHERE s.verified = 1 AND COALESCE(s.owner_offline, 0) = 0
         ORDER BY datetime(st.updated_at) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(statuses))
}

pub async fn get_owner_server_submission(
    State(pool): State<SqlitePool>,
    Json(payload): Json<ServerSubmissionOwnerAuthPayload>,
) -> Result<Json<ServerSubmission>, (StatusCode, String)> {
    let id = verify_owner_access(&pool, &payload.contact_email, &payload.code).await?;
    let mut submission = sqlx::query_as::<_, ServerSubmission>(server_submission_by_id_sql())
        .bind(&id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    sanitize_server_submission_tags(&mut submission);

    Ok(Json(submission))
}

pub async fn update_owner_server_submission(
    State(pool): State<SqlitePool>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let auth: ServerSubmissionOwnerAuthPayload = serde_json::from_value(payload.clone())
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let update: OwnerUpdateServerSubmissionPayload =
        serde_json::from_value(payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let id = verify_owner_access(&pool, &auth.contact_email, &auth.code).await?;

    let safe_name = clean(&update.name).trim().to_string();
    let safe_description = clean(&update.description);
    let safe_ip = update.ip.trim().to_string();
    let safe_versions = validate_mc_versions(&pool, &update.versions).await?;
    let safe_features = sanitize_icon_tags(&update.features);
    let safe_mechanics = sanitize_icon_tags(&update.mechanics);
    let safe_elements = sanitize_icon_tags(&update.elements);
    let safe_community = sanitize_icon_tags(&update.community);

    validate_server_submission_fields(
        &safe_name,
        &safe_ip,
        &update.icon,
        &update.hero,
        update.port,
        update.max_players,
        update.server_type.trim(),
        &update.modpack_url,
        update.has_voice_chat,
        &update.voice_url,
        &update.age_recommendation,
    )?;

    sqlx::query(
        "UPDATE server_submissions
         SET name = ?, description = ?, ip = ?, port = ?, versions = ?, max_players = ?, online_players = ?,
             icon = ?, hero = ?, website = ?, server_type = ?, language = ?, modpack_url = ?,
             has_paid_content = ?, age_recommendation = ?,
             social_links = ?, has_voice_chat = ?, voice_platform = ?, voice_url = ?,
             features = ?, mechanics = ?, elements = ?, community = ?, tags = ?,
             owner_offline = 0
         WHERE id = ?",
    )
    .bind(&safe_name)
    .bind(safe_description)
    .bind(&safe_ip)
    .bind(update.port)
    .bind(SqlxJson(&safe_versions))
    .bind(update.max_players)
    .bind(update.online_players)
    .bind(update.icon.trim())
    .bind(update.hero.trim())
    .bind(update.website.trim())
    .bind(update.server_type.trim())
    .bind(update.language.trim())
    .bind(update.modpack_url.trim())
    .bind(update.has_paid_content)
    .bind(&update.age_recommendation)
    .bind(SqlxJson(&update.social_links))
    .bind(update.has_voice_chat)
    .bind(update.voice_platform.trim())
    .bind(update.voice_url.trim())
    .bind(SqlxJson(&safe_features))
    .bind(SqlxJson(&safe_mechanics))
    .bind(SqlxJson(&safe_elements))
    .bind(SqlxJson(&safe_community))
    .bind(SqlxJson(&update.tags))
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "message": "updated" })))
}

pub async fn offline_owner_server_submission(
    State(pool): State<SqlitePool>,
    Json(payload): Json<ServerSubmissionOwnerAuthPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let id = verify_owner_access(&pool, &payload.contact_email, &payload.code).await?;

    sqlx::query("UPDATE server_submissions SET owner_offline = 1, verified = 0 WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "message": "offline" })))
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
    let safe_contact_email = normalize_submission_email(&payload.contact_email)?;
    let safe_versions = validate_mc_versions(&pool, &payload.versions).await?;
    let safe_features = sanitize_icon_tags(&payload.features);
    let safe_mechanics = sanitize_icon_tags(&payload.mechanics);
    let safe_elements = sanitize_icon_tags(&payload.elements);
    let safe_community = sanitize_icon_tags(&payload.community);

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

    let current_submission: (String, bool, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT contact_email, email_verified, email_verified_at, email_verification_id
         FROM server_submissions
         WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Submission not found".to_string()))?;

    let email_changed = current_submission.0 != safe_contact_email;
    let email_verified = if email_changed {
        false
    } else {
        current_submission.1
    };
    let email_verified_at = if email_changed {
        None
    } else {
        current_submission.2.clone()
    };
    let email_verification_id = if email_changed {
        None
    } else {
        current_submission.3.clone()
    };

    sqlx::query(
        "UPDATE server_submissions
         SET name = ?, description = ?, ip = ?, port = ?, versions = ?, max_players = ?, online_players = ?,
             icon = ?, hero = ?, contact_email = ?, email_verified = ?, email_verified_at = ?, email_verification_id = ?,
             website = ?, server_type = ?, language = ?, modpack_url = ?,
             has_paid_content = ?, age_recommendation = ?,
             social_links = ?, has_voice_chat = ?, voice_platform = ?, voice_url = ?, sort_id = ?,
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
    .bind(email_verified)
    .bind(&email_verified_at)
    .bind(&email_verification_id)
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
    .bind(payload.sort_id.max(0))
    .bind(SqlxJson(&safe_features))
    .bind(SqlxJson(&safe_mechanics))
    .bind(SqlxJson(&safe_elements))
    .bind(SqlxJson(&safe_community))
    .bind(SqlxJson(&payload.tags))
    .bind(payload.verified)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

pub async fn send_submission_email_to_submitter(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<SendSubmissionContactEmailPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let (contact_email,): (String,) = sqlx::query_as(
        "SELECT contact_email
         FROM server_submissions
         WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Submission not found".to_string()))?;

    send_submission_custom_email(
        &pool,
        &contact_email,
        payload.subject.as_str(),
        payload.body.as_str(),
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "email sent" })))
}

pub async fn toggle_verify(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let (name, contact_email, was_verified): (String, String, bool) =
        sqlx::query_as("SELECT name, contact_email, verified FROM server_submissions WHERE id = ?")
            .bind(&id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::NOT_FOUND, "Submission not found".to_string()))?;

    let next_verified = !was_verified;
    let mut owner_code_sent = false;
    let mut mail_error: Option<String> = None;

    if next_verified {
        let safe_email = normalize_submission_email(&contact_email)?;
        let owner_code = generate_owner_token();
        let owner_token_hash = hash_owner_token(&safe_email, &owner_code);

        sqlx::query(
            "UPDATE server_submissions
             SET verified = 1,
                 owner_offline = 0,
                 owner_token_hash = ?,
                 owner_token_issued_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(&owner_token_hash)
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let subject = format!("您的服务器「{}」已通过审核", name);
        let body = format!(
            "您好，\n\n您的服务器「{}」已通过审核并上线。\n\n服务器管理 Code：{}\n\n您可以在服务器提交页面的“修改服务器信息”入口，使用原始邮箱地址和该 Code 修改服务器资料或下线服务器。\n\n请妥善保存该 Code，不要公开分享。",
            name, owner_code
        );

        match send_submission_custom_email(&pool, &safe_email, &subject, &body).await {
            Ok(()) => owner_code_sent = true,
            Err((_, error)) => {
                mail_error = Some(error);
                eprintln!(
                    "[server_submissions] owner token email failed for {}: {}",
                    safe_email,
                    mail_error.as_deref().unwrap_or_default()
                );
            }
        }
    } else {
        sqlx::query("UPDATE server_submissions SET verified = 0 WHERE id = ?")
            .bind(&id)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(serde_json::json!({
        "verified": next_verified,
        "ownerCodeSent": owner_code_sent,
        "mailError": mail_error,
    })))
}

pub async fn get_server_tags_dict(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerTagDict>>, (StatusCode, String)> {
    let mut dict = sqlx::query_as::<_, ServerTagDict>(
        "SELECT * FROM server_tags_dict ORDER BY priority ASC, id ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    sanitize_server_tag_dict_items(&mut dict);

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
    .bind(sanitize_svg(&payload.icon_svg))
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
    .bind(sanitize_svg(&payload.icon_svg))
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

    let total_servers_sql = "SELECT COUNT(*) FROM server_submissions WHERE verified = 1 AND COALESCE(owner_offline, 0) = 0";
    let total_servers: (i64,) = sqlx::query_as(total_servers_sql)
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
         WHERE verified = 1 AND COALESCE(owner_offline, 0) = 0
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
             WHERE verified = 1 AND COALESCE(owner_offline, 0) = 0
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

    sqlx::query(
        "DELETE FROM server_status_history WHERE recorded_at < datetime('now', '-30 days')",
    )
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

        let parsed: SlpResponse = serde_json::from_slice(&json_buf)
            .map_err(|e| format!("parse status json failed: {}", e))?;

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

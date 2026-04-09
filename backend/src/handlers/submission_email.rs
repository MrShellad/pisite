use crate::models::{
    Claims, SendSubmissionEmailCodePayload, SendSubmissionEmailCodeResponse, SubmissionEmailConfig,
    SubmissionEmailConfigTestPayload, SubmissionEmailRule, SubmissionEmailRulePayload,
    UpdateSubmissionEmailConfigPayload, VerifySubmissionEmailCodePayload,
    VerifySubmissionEmailCodeResponse,
};
use ammonia::clean;
use axum::{
    Json,
    extract::{Path as AxumPath, State},
    http::StatusCode,
};
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    message::Mailbox,
    transport::smtp::authentication::Credentials,
};
use once_cell::sync::Lazy;
use regex::Regex;
use sha2::{Digest, Sha256};
use sqlx::{FromRow, SqlitePool};
use std::time::Duration;
use uuid::Uuid;

static EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$").expect("valid email regex")
});

// ---------------------------------------------------------------------------
// Internal DB record (includes password — never exposed to frontend)
// ---------------------------------------------------------------------------

#[derive(Clone, FromRow)]
struct SubmissionEmailConfigRecord {
    id: String,
    enabled: bool,
    smtp_host: String,
    smtp_port: i32,
    smtp_username: String,
    smtp_password: String,
    smtp_from_email: String,
    smtp_from_name: String,
    smtp_reply_to: String,
    smtp_security: String,
    smtp_auth: String,
    code_ttl_minutes: i32,
    resend_cooldown_seconds: i32,
    max_verify_attempts: i32,
    email_subject_template: String,
    email_body_template: String,
}

#[derive(FromRow)]
struct SubmissionEmailVerificationRow {
    id: String,
    email: String,
    code_hash: String,
    verification_token: Option<String>,
    expires_at: String,
    verified_at: Option<String>,
    consumed_at: Option<String>,
    verify_attempts: i32,
    is_expired: bool,
}

#[derive(FromRow)]
struct SubmissionEmailTokenRow {
    id: String,
    verified_at: Option<String>,
    consumed_at: Option<String>,
    is_expired: bool,
}

// ---------------------------------------------------------------------------
// lettre helpers
// ---------------------------------------------------------------------------

fn build_lettre_transport(
    config: &SubmissionEmailConfigRecord,
) -> Result<AsyncSmtpTransport<Tokio1Executor>, String> {
    let host = config.smtp_host.trim();

    let builder = match config.smtp_security.as_str() {
        "tls" => AsyncSmtpTransport::<Tokio1Executor>::relay(host)
            .map_err(|e| format!("smtp relay error: {}", e))?,
        "starttls" => AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)
            .map_err(|e| format!("smtp starttls relay error: {}", e))?,
        _ => {
            AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(host)
        }
    };

    let builder = builder.port(config.smtp_port as u16);

    let builder = if config.smtp_auth != "none" {
        builder.credentials(Credentials::new(
            config.smtp_username.clone(),
            config.smtp_password.clone(),
        ))
    } else {
        builder
    };

    let builder = builder.timeout(Some(Duration::from_secs(15)));

    Ok(builder.build())
}

fn build_lettre_message(
    config: &SubmissionEmailConfigRecord,
    to_email: &str,
    subject: &str,
    body: &str,
) -> Result<Message, String> {
    let from_mailbox: Mailbox = if config.smtp_from_name.trim().is_empty() {
        config
            .smtp_from_email
            .parse()
            .map_err(|e| format!("invalid from email: {}", e))?
    } else {
        format!("{} <{}>", config.smtp_from_name.trim(), config.smtp_from_email.trim())
            .parse()
            .map_err(|e| format!("invalid from mailbox: {}", e))?
    };

    let to_mailbox: Mailbox = to_email
        .parse()
        .map_err(|e| format!("invalid to email: {}", e))?;

    let mut builder = Message::builder()
        .from(from_mailbox)
        .to(to_mailbox)
        .subject(subject);

    if !config.smtp_reply_to.trim().is_empty() {
        let reply_to: Mailbox = config
            .smtp_reply_to
            .trim()
            .parse()
            .map_err(|e| format!("invalid reply-to email: {}", e))?;
        builder = builder.reply_to(reply_to);
    }

    builder
        .body(body.to_string())
        .map_err(|e| format!("failed to build email message: {}", e))
}

/// Send an email via lettre and return the error string on failure.
async fn send_email_via_lettre(
    config: &SubmissionEmailConfigRecord,
    to_email: &str,
    subject: &str,
    body: &str,
) -> Result<(), String> {
    let transport = build_lettre_transport(config)?;
    let message = build_lettre_message(config, to_email, subject, body)?;
    transport
        .send(message)
        .await
        .map_err(|e| format!("smtp send failed: {}", e))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Shared helpers (email, rules, verification codes …)
// ---------------------------------------------------------------------------

fn normalize_rule_pattern(pattern_type: &str, raw: &str) -> String {
    let trimmed = raw.trim().to_lowercase();
    match pattern_type {
        "domain_suffix" => trimmed
            .trim_start_matches('@')
            .trim_start_matches('.')
            .to_string(),
        _ => trimmed,
    }
}

fn hash_verification_code(verification_id: &str, code: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verification_id.as_bytes());
    hasher.update(b":");
    hasher.update(code.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn generate_verification_code(verification_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(Uuid::new_v4().as_bytes());
    hasher.update(verification_id.as_bytes());
    let digest = hasher.finalize();
    let mut value = 0_u32;
    for byte in digest.iter().take(4) {
        value = (value << 8) | u32::from(*byte);
    }
    format!("{:06}", value % 1_000_000)
}

pub fn normalize_submission_email(raw: &str) -> Result<String, (StatusCode, String)> {
    let email = raw.trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Contact email is required".to_string()));
    }

    if !EMAIL_REGEX.is_match(&email) {
        return Err((StatusCode::BAD_REQUEST, "Invalid contact email".to_string()));
    }

    Ok(email)
}

fn split_email_domain(email: &str) -> (&str, &str) {
    match email.rsplit_once('@') {
        Some((local_part, domain)) => (local_part, domain),
        None => ("", ""),
    }
}

fn email_rule_matches(email: &str, rule: &SubmissionEmailRule) -> bool {
    let (_, domain) = split_email_domain(email);
    match rule.pattern_type.as_str() {
        "exact_email" => email == rule.pattern,
        "domain_suffix" => {
            let suffix = rule.pattern.trim_start_matches('.');
            !suffix.is_empty() && (domain == suffix || domain.ends_with(&format!(".{}", suffix)))
        }
        "contains" => email.contains(&rule.pattern),
        _ => false,
    }
}

async fn load_submission_email_config_record(
    pool: &SqlitePool,
) -> Result<SubmissionEmailConfigRecord, (StatusCode, String)> {
    sqlx::query_as::<_, SubmissionEmailConfigRecord>(
        "SELECT
            id,
            enabled,
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
            smtp_from_email,
            smtp_from_name,
            smtp_reply_to,
            smtp_security,
            smtp_auth,
            code_ttl_minutes,
            resend_cooldown_seconds,
            max_verify_attempts,
            email_subject_template,
            email_body_template
         FROM submission_email_config
         WHERE id = '1'",
    )
    .fetch_one(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

fn validate_submission_email_config(
    config: &SubmissionEmailConfigRecord,
    require_enabled: bool,
) -> Result<(), (StatusCode, String)> {
    if require_enabled && !config.enabled {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Email verification is not enabled".to_string(),
        ));
    }

    if config.smtp_host.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "SMTP host is required".to_string()));
    }

    if !(1..=65_535).contains(&config.smtp_port) {
        return Err((StatusCode::BAD_REQUEST, "Invalid SMTP port".to_string()));
    }

    if !["none", "starttls", "tls"].contains(&config.smtp_security.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid SMTP security".to_string()));
    }

    if !["none", "plain", "login"].contains(&config.smtp_auth.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid SMTP auth mode".to_string()));
    }

    let _ = normalize_submission_email(&config.smtp_from_email)?;
    if !config.smtp_reply_to.trim().is_empty() {
        let _ = normalize_submission_email(&config.smtp_reply_to)?;
    }

    if config.smtp_auth != "none" {
        if config.smtp_username.trim().is_empty() {
            return Err((StatusCode::BAD_REQUEST, "SMTP username is required".to_string()));
        }
        if config.smtp_password.trim().is_empty() {
            return Err((StatusCode::BAD_REQUEST, "SMTP password is required".to_string()));
        }
    }

    Ok(())
}

async fn cleanup_submission_email_verifications(pool: &SqlitePool) {
    let _ = sqlx::query(
        "DELETE FROM submission_email_verifications
         WHERE datetime(created_at) < datetime('now', '-7 days')",
    )
    .execute(pool)
    .await;
}

async fn enforce_submission_email_rules(
    pool: &SqlitePool,
    email: &str,
) -> Result<(), (StatusCode, String)> {
    let rules = sqlx::query_as::<_, SubmissionEmailRule>(
        "SELECT id, mode, pattern_type, pattern, description, priority, enabled, created_at
         FROM submission_email_rules
         WHERE enabled = 1
         ORDER BY priority DESC, datetime(created_at) ASC, id ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut has_whitelist = false;
    let mut whitelist_matched = false;

    for rule in &rules {
        if rule.mode == "blacklist" && email_rule_matches(email, rule) {
            return Err((
                StatusCode::FORBIDDEN,
                format!("The email address is rejected by rule: {}", rule.pattern),
            ));
        }

        if rule.mode == "whitelist" {
            has_whitelist = true;
            if email_rule_matches(email, rule) {
                whitelist_matched = true;
            }
        }
    }

    if has_whitelist && !whitelist_matched {
        return Err((
            StatusCode::FORBIDDEN,
            "The email address is not allowed by current whitelist rules".to_string(),
        ));
    }

    Ok(())
}

fn validate_rule_payload(
    payload: &SubmissionEmailRulePayload,
) -> Result<(String, String, String, String), (StatusCode, String)> {
    let mode = payload.mode.trim().to_lowercase();
    if !["whitelist", "blacklist"].contains(&mode.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid rule mode".to_string()));
    }

    let pattern_type = payload.pattern_type.trim().to_lowercase();
    if !["domain_suffix", "exact_email", "contains"].contains(&pattern_type.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid rule pattern type".to_string()));
    }

    let pattern = normalize_rule_pattern(&pattern_type, &payload.pattern);
    if pattern.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Rule pattern is required".to_string()));
    }

    if pattern_type == "exact_email" {
        let _ = normalize_submission_email(&pattern)?;
    }

    Ok((
        mode,
        pattern_type,
        pattern,
        clean(&payload.description).trim().to_string(),
    ))
}

fn sanitize_header_value(raw: &str) -> String {
    raw.replace(['\r', '\n'], " ").trim().to_string()
}

// ---------------------------------------------------------------------------
// Admin: SMTP config CRUD
// ---------------------------------------------------------------------------

pub async fn get_submission_email_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<SubmissionEmailConfig>, (StatusCode, String)> {
    let config = sqlx::query_as::<_, SubmissionEmailConfig>(
        "SELECT
            id,
            enabled,
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_from_email,
            smtp_from_name,
            smtp_reply_to,
            smtp_security,
            smtp_auth,
            CASE WHEN LENGTH(COALESCE(smtp_password, '')) > 0 THEN 1 ELSE 0 END AS has_password,
            code_ttl_minutes,
            resend_cooldown_seconds,
            max_verify_attempts,
            email_subject_template,
            email_body_template,
            updated_at
         FROM submission_email_config
         WHERE id = '1'",
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(config))
}

pub async fn update_submission_email_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<UpdateSubmissionEmailConfigPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let existing = load_submission_email_config_record(&pool).await?;

    let smtp_password = if payload.clear_smtp_password {
        String::new()
    } else if let Some(password) = payload.smtp_password {
        password.trim().to_string()
    } else {
        existing.smtp_password
    };

    let config = SubmissionEmailConfigRecord {
        id: "1".to_string(),
        enabled: payload.enabled,
        smtp_host: payload.smtp_host.trim().to_string(),
        smtp_port: payload.smtp_port,
        smtp_username: payload.smtp_username.trim().to_string(),
        smtp_password,
        smtp_from_email: normalize_submission_email(&payload.smtp_from_email)?,
        smtp_from_name: sanitize_header_value(&payload.smtp_from_name),
        smtp_reply_to: if payload.smtp_reply_to.trim().is_empty() {
            String::new()
        } else {
            normalize_submission_email(&payload.smtp_reply_to)?
        },
        smtp_security: payload.smtp_security.trim().to_lowercase(),
        smtp_auth: payload.smtp_auth.trim().to_lowercase(),
        code_ttl_minutes: payload.code_ttl_minutes.clamp(5, 60),
        resend_cooldown_seconds: payload.resend_cooldown_seconds.clamp(15, 600),
        max_verify_attempts: payload.max_verify_attempts.clamp(1, 10),
        email_subject_template: payload.email_subject_template.trim().to_string(),
        email_body_template: payload.email_body_template.trim().to_string(),
    };

    validate_submission_email_config(&config, false)?;

    sqlx::query(
        "UPDATE submission_email_config
         SET enabled = ?,
             smtp_host = ?,
             smtp_port = ?,
             smtp_username = ?,
             smtp_password = ?,
             smtp_from_email = ?,
             smtp_from_name = ?,
             smtp_reply_to = ?,
             smtp_security = ?,
             smtp_auth = ?,
             code_ttl_minutes = ?,
             resend_cooldown_seconds = ?,
             max_verify_attempts = ?,
             email_subject_template = ?,
             email_body_template = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = '1'",
    )
    .bind(config.enabled)
    .bind(&config.smtp_host)
    .bind(config.smtp_port)
    .bind(&config.smtp_username)
    .bind(&config.smtp_password)
    .bind(&config.smtp_from_email)
    .bind(&config.smtp_from_name)
    .bind(&config.smtp_reply_to)
    .bind(&config.smtp_security)
    .bind(&config.smtp_auth)
    .bind(config.code_ttl_minutes)
    .bind(config.resend_cooldown_seconds)
    .bind(config.max_verify_attempts)
    .bind(&config.email_subject_template)
    .bind(&config.email_body_template)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// ---------------------------------------------------------------------------
// Admin: test email (synchronous — admin needs immediate feedback)
// ---------------------------------------------------------------------------

pub async fn send_submission_email_test(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<SubmissionEmailConfigTestPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let config = load_submission_email_config_record(&pool).await?;
    validate_submission_email_config(&config, false)?;

    let to_email = normalize_submission_email(&payload.to_email)?;
    send_email_via_lettre(
        &config,
        &to_email,
        "SMTP configuration test",
        "This is a test email from the server submission verification module.",
    )
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    Ok(Json(serde_json::json!({ "message": "test email sent" })))
}

// ---------------------------------------------------------------------------
// Admin: email filter rules CRUD
// ---------------------------------------------------------------------------

pub async fn list_submission_email_rules(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<SubmissionEmailRule>>, (StatusCode, String)> {
    let rules = sqlx::query_as::<_, SubmissionEmailRule>(
        "SELECT id, mode, pattern_type, pattern, description, priority, enabled, created_at
         FROM submission_email_rules
         ORDER BY priority DESC, datetime(created_at) ASC, id ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(rules))
}

pub async fn create_submission_email_rule(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<SubmissionEmailRulePayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let (mode, pattern_type, pattern, description) = validate_rule_payload(&payload)?;

    sqlx::query(
        "INSERT INTO submission_email_rules (
            id, mode, pattern_type, pattern, description, priority, enabled
         ) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(Uuid::new_v4().to_string())
    .bind(mode)
    .bind(pattern_type)
    .bind(pattern)
    .bind(description)
    .bind(payload.priority)
    .bind(payload.enabled)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::CREATED)
}

pub async fn update_submission_email_rule(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<SubmissionEmailRulePayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let (mode, pattern_type, pattern, description) = validate_rule_payload(&payload)?;

    let result = sqlx::query(
        "UPDATE submission_email_rules
         SET mode = ?, pattern_type = ?, pattern = ?, description = ?, priority = ?, enabled = ?
         WHERE id = ?",
    )
    .bind(mode)
    .bind(pattern_type)
    .bind(pattern)
    .bind(description)
    .bind(payload.priority)
    .bind(payload.enabled)
    .bind(id.trim())
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Rule not found".to_string()));
    }

    Ok(StatusCode::OK)
}

pub async fn delete_submission_email_rule(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM submission_email_rules WHERE id = ?")
        .bind(id.trim())
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Rule not found".to_string()));
    }

    Ok(StatusCode::OK)
}

// ---------------------------------------------------------------------------
// Public: send verification code (async background delivery)
// ---------------------------------------------------------------------------

pub async fn send_submission_email_code(
    State(pool): State<SqlitePool>,
    Json(payload): Json<SendSubmissionEmailCodePayload>,
) -> Result<Json<SendSubmissionEmailCodeResponse>, (StatusCode, String)> {
    let email = normalize_submission_email(&payload.email)?;
    let config = load_submission_email_config_record(&pool).await?;
    validate_submission_email_config(&config, true)?;
    enforce_submission_email_rules(&pool, &email).await?;
    cleanup_submission_email_verifications(&pool).await;

    // Rate-limit check
    let last_sent_seconds_ago = sqlx::query_as::<_, (Option<i64>,)>(
        "SELECT CAST(strftime('%s', 'now') - strftime('%s', last_sent_at) AS INTEGER)
         FROM submission_email_verifications
         WHERE email = ? AND last_sent_at IS NOT NULL
         ORDER BY datetime(last_sent_at) DESC
         LIMIT 1",
    )
    .bind(&email)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some((Some(seconds_ago),)) = last_sent_seconds_ago {
        if seconds_ago < i64::from(config.resend_cooldown_seconds) {
            let wait_seconds = i64::from(config.resend_cooldown_seconds) - seconds_ago;
            return Err((
                StatusCode::TOO_MANY_REQUESTS,
                format!("Please wait {} seconds before requesting another code", wait_seconds),
            ));
        }
    }

    // Generate code + insert verification record
    let verification_id = Uuid::new_v4().to_string();
    let code = generate_verification_code(&verification_id);
    let code_hash = hash_verification_code(&verification_id, &code);

    sqlx::query(
        "INSERT INTO submission_email_verifications (
            id, email, code_hash, expires_at, last_sent_at, send_count, verify_attempts
         ) VALUES (
            ?, ?, ?, datetime('now', '+' || ? || ' minutes'), CURRENT_TIMESTAMP, 1, 0
         )",
    )
    .bind(&verification_id)
    .bind(&email)
    .bind(&code_hash)
    .bind(config.code_ttl_minutes)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Build email content from templates
    let body = config
        .email_body_template
        .replace("{code}", &code)
        .replace("{ttl}", &config.code_ttl_minutes.to_string());

    let subject = config
        .email_subject_template
        .replace("{code}", &code)
        .replace("{ttl}", &config.code_ttl_minutes.to_string());

    // Capture values before moving config into the background task
    let response_expires = i64::from(config.code_ttl_minutes) * 60;
    let response_cooldown = i64::from(config.resend_cooldown_seconds);

    // Fire-and-forget: send email in background task
    let bg_verification_id = verification_id.clone();
    let bg_email = email.clone();
    let bg_pool = pool.clone();
    tokio::spawn(async move {
        if let Err(err) = send_email_via_lettre(&config, &bg_email, &subject, &body).await {
            eprintln!(
                "[submission_email] background send failed for {}: {}",
                bg_email, err
            );
            // Clean up verification record so the user can retry
            let _ = sqlx::query("DELETE FROM submission_email_verifications WHERE id = ?")
                .bind(&bg_verification_id)
                .execute(&bg_pool)
                .await;
        }
    });

    // Return immediately — don't wait for SMTP
    Ok(Json(SendSubmissionEmailCodeResponse {
        verification_id,
        expires_in_seconds: response_expires,
        cooldown_seconds: response_cooldown,
    }))
}

// ---------------------------------------------------------------------------
// Public: verify code
// ---------------------------------------------------------------------------

pub async fn verify_submission_email_code(
    State(pool): State<SqlitePool>,
    Json(payload): Json<VerifySubmissionEmailCodePayload>,
) -> Result<Json<VerifySubmissionEmailCodeResponse>, (StatusCode, String)> {
    let email = normalize_submission_email(&payload.email)?;
    let verification_id = payload.verification_id.trim();
    let code = payload.code.trim();

    if verification_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Verification id is required".to_string()));
    }

    if code.len() != 6 || !code.chars().all(|ch| ch.is_ascii_digit()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid verification code".to_string()));
    }

    let config = load_submission_email_config_record(&pool).await?;
    let row = sqlx::query_as::<_, SubmissionEmailVerificationRow>(
        "SELECT
            id,
            email,
            code_hash,
            verification_token,
            expires_at,
            verified_at,
            consumed_at,
            verify_attempts,
            CASE WHEN datetime(expires_at) <= datetime('now') THEN 1 ELSE 0 END AS is_expired
         FROM submission_email_verifications
         WHERE id = ? AND email = ?",
    )
    .bind(verification_id)
    .bind(&email)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Verification session not found".to_string()))?;

    let _ = (&row.email, &row.expires_at);

    if row.consumed_at.is_some() {
        return Err((
            StatusCode::CONFLICT,
            "Verification token has already been used".to_string(),
        ));
    }

    if row.is_expired {
        return Err((StatusCode::BAD_REQUEST, "Verification code has expired".to_string()));
    }

    if let (Some(token), Some(verified_at)) = (row.verification_token.clone(), row.verified_at.clone())
    {
        return Ok(Json(VerifySubmissionEmailCodeResponse {
            verification_token: token,
            verified_at,
        }));
    }

    if row.verify_attempts >= config.max_verify_attempts {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            "Too many invalid attempts, please request a new code".to_string(),
        ));
    }

    if row.code_hash != hash_verification_code(verification_id, code) {
        let _ = sqlx::query(
            "UPDATE submission_email_verifications
             SET verify_attempts = verify_attempts + 1
             WHERE id = ?",
        )
        .bind(verification_id)
        .execute(&pool)
        .await;
        return Err((StatusCode::UNAUTHORIZED, "Verification code is incorrect".to_string()));
    }

    let now: (String,) = sqlx::query_as("SELECT CURRENT_TIMESTAMP")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let verification_token = Uuid::new_v4().to_string();

    sqlx::query(
        "UPDATE submission_email_verifications
         SET verification_token = ?, verified_at = ?
         WHERE id = ?",
    )
    .bind(&verification_token)
    .bind(&now.0)
    .bind(verification_id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(VerifySubmissionEmailCodeResponse {
        verification_token,
        verified_at: now.0,
    }))
}

// ---------------------------------------------------------------------------
// Internal: consume verified token (called by server_submissions)
// ---------------------------------------------------------------------------

pub async fn check_submission_email_token(
    pool: &SqlitePool,
    email: &str,
    verification_token: &str,
) -> Result<(String, String), (StatusCode, String)> {
    let row = sqlx::query_as::<_, SubmissionEmailTokenRow>(
        "SELECT
            id,
            verified_at,
            consumed_at,
            CASE WHEN datetime(expires_at) <= datetime('now') THEN 1 ELSE 0 END AS is_expired
         FROM submission_email_verifications
         WHERE email = ? AND verification_token = ?",
    )
    .bind(email)
    .bind(verification_token.trim())
    .fetch_optional(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((
        StatusCode::UNAUTHORIZED,
        "Email verification token is invalid".to_string(),
    ))?;

    let verified_at = row.verified_at.ok_or((
        StatusCode::UNAUTHORIZED,
        "Email has not been verified yet".to_string(),
    ))?;

    if row.is_expired {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Email verification token has expired".to_string(),
        ));
    }

    if row.consumed_at.is_some() {
        return Err((
            StatusCode::CONFLICT,
            "Email verification token has already been used".to_string(),
        ));
    }

    Ok((row.id, verified_at))
}

pub async fn consume_submission_email_token(
    pool: &SqlitePool,
    verification_id: &str,
    server_submission_id: &str,
) -> Result<(), (StatusCode, String)> {
    let result = sqlx::query(
        "UPDATE submission_email_verifications
         SET consumed_at = CURRENT_TIMESTAMP, server_submission_id = ?
         WHERE id = ? AND consumed_at IS NULL",
    )
    .bind(server_submission_id)
    .bind(verification_id)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::CONFLICT,
            "Email verification token has already been used".to_string(),
        ));
    }

    Ok(())
}

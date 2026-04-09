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
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use once_cell::sync::Lazy;
use regex::Regex;
use rustls::{ClientConfig, RootCertStore, pki_types::ServerName};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, SqlitePool};
use std::{sync::Arc, time::Duration};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufStream},
    net::TcpStream,
    time::timeout,
};
use tokio_rustls::TlsConnector;
use uuid::Uuid;

static EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$").expect("valid email regex")
});

const SMTP_TIMEOUT_SECS: u64 = 10;

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

trait AsyncIoStream: AsyncRead + AsyncWrite + Unpin + Send {}
impl<T> AsyncIoStream for T where T: AsyncRead + AsyncWrite + Unpin + Send {}

struct SmtpClient {
    stream: BufStream<Box<dyn AsyncIoStream>>,
}

impl SmtpClient {
    fn new_plain(stream: TcpStream) -> Self {
        Self {
            stream: BufStream::new(Box::new(stream)),
        }
    }

    async fn new_tls(stream: TcpStream, host: &str) -> Result<Self, String> {
        let tls_stream = wrap_tls(stream, host).await?;
        Ok(Self {
            stream: BufStream::new(Box::new(tls_stream)),
        })
    }

    async fn upgrade_tls(self, host: &str) -> Result<Self, String> {
        let stream = self.stream.into_inner();
        let tls_stream = wrap_tls(stream, host).await?;
        Ok(Self {
            stream: BufStream::new(Box::new(tls_stream)),
        })
    }

    async fn write_command(&mut self, command: &str) -> Result<(), String> {
        self.stream
            .write_all(command.as_bytes())
            .await
            .map_err(|e| format!("smtp write failed: {}", e))?;
        self.stream
            .write_all(b"\r\n")
            .await
            .map_err(|e| format!("smtp write failed: {}", e))?;
        self.stream
            .flush()
            .await
            .map_err(|e| format!("smtp flush failed: {}", e))?;
        Ok(())
    }

    async fn write_raw(&mut self, raw: &str) -> Result<(), String> {
        self.stream
            .write_all(raw.as_bytes())
            .await
            .map_err(|e| format!("smtp write failed: {}", e))?;
        self.stream
            .flush()
            .await
            .map_err(|e| format!("smtp flush failed: {}", e))?;
        Ok(())
    }

    async fn read_response(&mut self) -> Result<(u16, Vec<String>), String> {
        let mut code: Option<u16> = None;
        let mut lines = Vec::new();

        loop {
            let mut line = String::new();
            let bytes = self
                .stream
                .read_line(&mut line)
                .await
                .map_err(|e| format!("smtp read failed: {}", e))?;
            if bytes == 0 {
                return Err("smtp connection closed unexpectedly".to_string());
            }

            let line = line.trim_end_matches(['\r', '\n']).to_string();
            if line.len() < 3 {
                return Err("invalid smtp response".to_string());
            }

            let current_code = line[0..3]
                .parse::<u16>()
                .map_err(|_| format!("invalid smtp response code: {}", line))?;

            match code {
                Some(existing) if existing != current_code => {
                    return Err(format!("mixed smtp response codes: {}", line));
                }
                None => code = Some(current_code),
                _ => {}
            }

            let is_last = line.as_bytes().get(3).copied() != Some(b'-');
            lines.push(line);
            if is_last {
                break;
            }
        }

        Ok((code.unwrap_or(0), lines))
    }

    async fn expect_codes(
        &mut self,
        expected: &[u16],
        operation: &str,
    ) -> Result<Vec<String>, String> {
        let (code, lines) = self.read_response().await?;
        if expected.contains(&code) {
            Ok(lines)
        } else {
            Err(format!(
                "smtp {} failed with code {}: {}",
                operation,
                code,
                lines.join(" | ")
            ))
        }
    }
}

fn sanitize_header_value(raw: &str) -> String {
    raw.replace(['\r', '\n'], " ").trim().to_string()
}

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

fn build_from_header(name: &str, email: &str) -> String {
    let safe_name = sanitize_header_value(name);
    let safe_email = sanitize_header_value(email);
    if safe_name.is_empty() || !safe_name.is_ascii() {
        format!("<{}>", safe_email)
    } else {
        format!("{} <{}>", safe_name, safe_email)
    }
}

fn normalize_body_for_smtp(body: &str) -> String {
    body.replace("\r\n", "\n")
        .replace('\r', "\n")
        .lines()
        .map(|line| {
            if line.starts_with('.') {
                format!(".{}", line)
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\r\n")
}

async fn authenticate_smtp(
    client: &mut SmtpClient,
    config: &SubmissionEmailConfigRecord,
) -> Result<(), String> {
    match config.smtp_auth.as_str() {
        "plain" => {
            let payload = format!("\0{}\0{}", config.smtp_username, config.smtp_password);
            let encoded = BASE64_STANDARD.encode(payload.as_bytes());
            client
                .write_command(&format!("AUTH PLAIN {}", encoded))
                .await?;
            client.expect_codes(&[235], "AUTH PLAIN").await?;
        }
        "login" => {
            client.write_command("AUTH LOGIN").await?;
            client.expect_codes(&[334], "AUTH LOGIN username").await?;
            client
                .write_command(&BASE64_STANDARD.encode(config.smtp_username.as_bytes()))
                .await?;
            client.expect_codes(&[334], "AUTH LOGIN password").await?;
            client
                .write_command(&BASE64_STANDARD.encode(config.smtp_password.as_bytes()))
                .await?;
            client.expect_codes(&[235], "AUTH LOGIN").await?;
        }
        "none" => {}
        _ => return Err("unsupported smtp auth mode".to_string()),
    }
    Ok(())
}

async fn wrap_tls<T>(stream: T, host: &str) -> Result<tokio_rustls::client::TlsStream<T>, String>
where
    T: AsyncRead + AsyncWrite + Unpin + Send + 'static,
{
    let root_store = RootCertStore::from_iter(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let client_config = ClientConfig::builder()
        .with_root_certificates(root_store)
        .with_no_client_auth();
    let connector = TlsConnector::from(Arc::new(client_config));
    let server_name =
        ServerName::try_from(host.to_string()).map_err(|_| "invalid smtp host name".to_string())?;
    connector
        .connect(server_name, stream)
        .await
        .map_err(|e| format!("smtp tls handshake failed: {}", e))
}

async fn send_smtp_message(
    config: &SubmissionEmailConfigRecord,
    to_email: &str,
    subject: &str,
    body: &str,
) -> Result<(), String> {
    timeout(Duration::from_secs(SMTP_TIMEOUT_SECS), async {
        let addr = format!("{}:{}", config.smtp_host.trim(), config.smtp_port);
        let stream = TcpStream::connect(&addr)
            .await
            .map_err(|e| format!("smtp connect failed: {}", e))?;

        let mut client = if config.smtp_security == "tls" {
            SmtpClient::new_tls(stream, config.smtp_host.trim()).await?
        } else {
            SmtpClient::new_plain(stream)
        };

        client.expect_codes(&[220], "greeting").await?;
        client.write_command("EHLO localhost").await?;
        client.expect_codes(&[250], "EHLO").await?;

        if config.smtp_security == "starttls" {
            client.write_command("STARTTLS").await?;
            client.expect_codes(&[220], "STARTTLS").await?;
            client = client.upgrade_tls(config.smtp_host.trim()).await?;
            client.write_command("EHLO localhost").await?;
            client.expect_codes(&[250], "EHLO after STARTTLS").await?;
        }

        if config.smtp_auth != "none" {
            authenticate_smtp(&mut client, config).await?;
        }

        client
            .write_command(&format!("MAIL FROM:<{}>", config.smtp_from_email))
            .await?;
        client.expect_codes(&[250], "MAIL FROM").await?;

        client
            .write_command(&format!("RCPT TO:<{}>", to_email))
            .await?;
        client.expect_codes(&[250, 251], "RCPT TO").await?;

        client.write_command("DATA").await?;
        client.expect_codes(&[354], "DATA").await?;

        let from_header = build_from_header(&config.smtp_from_name, &config.smtp_from_email);
        let reply_to_header = if config.smtp_reply_to.trim().is_empty() {
            String::new()
        } else {
            format!("Reply-To: <{}>\r\n", sanitize_header_value(&config.smtp_reply_to))
        };
        let body = normalize_body_for_smtp(body);
        let message = format!(
            concat!(
                "From: {}\r\n",
                "To: <{}>\r\n",
                "Subject: {}\r\n",
                "{}",
                "MIME-Version: 1.0\r\n",
                "Content-Type: text/plain; charset=utf-8\r\n",
                "Content-Transfer-Encoding: 8bit\r\n",
                "\r\n",
                "{}\r\n.\r\n"
            ),
            from_header,
            sanitize_header_value(to_email),
            sanitize_header_value(subject),
            reply_to_header,
            body,
        );

        client.write_raw(&message).await?;
        client.expect_codes(&[250], "message body").await?;

        let _ = client.write_command("QUIT").await;
        let _ = client.expect_codes(&[221], "QUIT").await;
        Ok(())
    })
    .await
    .map_err(|_| "smtp request timed out".to_string())?
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

pub async fn send_submission_email_test(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<SubmissionEmailConfigTestPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let config = load_submission_email_config_record(&pool).await?;
    validate_submission_email_config(&config, false)?;

    let to_email = normalize_submission_email(&payload.to_email)?;
    send_smtp_message(
        &config,
        &to_email,
        "SMTP configuration test",
        "This is a test email from the server submission verification module.",
    )
    .await
    .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    Ok(Json(serde_json::json!({ "message": "test email sent" })))
}

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

pub async fn send_submission_email_code(
    State(pool): State<SqlitePool>,
    Json(payload): Json<SendSubmissionEmailCodePayload>,
) -> Result<Json<SendSubmissionEmailCodeResponse>, (StatusCode, String)> {
    let email = normalize_submission_email(&payload.email)?;
    let config = load_submission_email_config_record(&pool).await?;
    validate_submission_email_config(&config, true)?;
    enforce_submission_email_rules(&pool, &email).await?;
    cleanup_submission_email_verifications(&pool).await;

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

    let body = config.email_body_template
        .replace("{code}", &code)
        .replace("{ttl}", &config.code_ttl_minutes.to_string());

    let subject = config.email_subject_template
        .replace("{code}", &code)
        .replace("{ttl}", &config.code_ttl_minutes.to_string());

    if let Err(err) = send_smtp_message(
        &config,
        &email,
        &subject,
        &body,
    )
    .await
    {
        let _ = sqlx::query("DELETE FROM submission_email_verifications WHERE id = ?")
            .bind(&verification_id)
            .execute(&pool)
            .await;
        return Err((StatusCode::BAD_GATEWAY, err));
    }

    Ok(Json(SendSubmissionEmailCodeResponse {
        verification_id,
        expires_in_seconds: i64::from(config.code_ttl_minutes) * 60,
        cooldown_seconds: i64::from(config.resend_cooldown_seconds),
    }))
}

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

pub async fn consume_verified_submission_email_token(
    pool: &SqlitePool,
    email: &str,
    verification_token: &str,
    server_submission_id: &str,
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

    let result = sqlx::query(
        "UPDATE submission_email_verifications
         SET consumed_at = CURRENT_TIMESTAMP, server_submission_id = ?
         WHERE id = ? AND consumed_at IS NULL",
    )
    .bind(server_submission_id)
    .bind(&row.id)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::CONFLICT,
            "Email verification token has already been used".to_string(),
        ));
    }

    Ok((row.id, verified_at))
}

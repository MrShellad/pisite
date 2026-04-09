use std::time::{SystemTime, UNIX_EPOCH};

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use md5::{Digest as _, Md5};
use ring::{
    aead::{self, Aad, LessSafeKey, Nonce, UnboundKey},
    rand::{SecureRandom, SystemRandom},
};
use serde::Deserialize;
use serde_json::json;
use sha2::Sha256;
use sqlx::SqlitePool;

use crate::models::{
    AfdianConfigPayload, AfdianConfigResponse, AfdianSponsorSnapshot, DonorAfdianBindingResponse,
    DonorUser,
};

#[derive(Deserialize)]
struct MojangProfileResponse {
    name: String,
}

#[derive(Deserialize)]
struct AfdianApiResponse<T> {
    ec: i32,
    em: String,
    data: T,
}

#[derive(Deserialize)]
struct AfdianSponsorListData {
    #[serde(default)]
    total_page: Option<i64>,
    #[serde(default)]
    list: Vec<AfdianSponsorItem>,
}

#[derive(Deserialize)]
struct AfdianSponsorItem {
    all_sum_amount: String,
    #[serde(default)]
    first_pay_time: Option<i64>,
    #[serde(default)]
    create_time: Option<i64>,
    #[serde(default)]
    last_pay_time: Option<i64>,
    user: AfdianSponsorUser,
}

#[derive(Deserialize)]
struct AfdianSponsorUser {
    user_id: String,
}

struct AfdianRuntimeConfig {
    creator_user_id: String,
    token: String,
}

pub fn normalize_mc_uuid(input: &str) -> Result<String, String> {
    let normalized = input.trim().replace('-', "").to_lowercase();
    if normalized.len() != 32 || !normalized.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return Err("Invalid Minecraft UUID. Expected 32 hexadecimal characters.".to_string());
    }
    Ok(normalized)
}

pub fn clean_optional_text(input: Option<String>) -> Option<String> {
    input.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

pub async fn fetch_donor_user(pool: &SqlitePool, user_id: &str) -> Result<DonorUser, String> {
    sqlx::query_as::<_, DonorUser>(
        "SELECT
            u.id AS id,
            u.mc_uuid AS mc_uuid,
            u.mc_name AS mc_name,
            u.email AS email,
            u.afdian_user_id AS afdian_user_id,
            COALESCE(hd.total_amount, 0.0) AS total_sponsored_amount,
            hd.started_at AS first_sponsored_at,
            hd.last_donated_at AS last_sponsored_at,
            COALESCE(hd.is_visible, 1) AS is_visible,
            u.created_at AS created_at
         FROM users u
         LEFT JOIN historical_donors hd ON hd.user_id = u.id
         WHERE u.id = ?",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn sync_user_mojang_profile(
    pool: &SqlitePool,
    user_id: &str,
) -> Result<Option<String>, String> {
    let user: Option<(String,)> = sqlx::query_as("SELECT mc_uuid FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    let Some((mc_uuid,)) = user else {
        return Err("User not found.".to_string());
    };

    let mc_name = fetch_mojang_name(&mc_uuid).await?;

    sqlx::query("UPDATE users SET mc_name = ? WHERE id = ?")
        .bind(&mc_name)
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    refresh_historical_donor(pool, user_id, None).await?;

    Ok(mc_name)
}

pub async fn refresh_historical_donor(
    pool: &SqlitePool,
    user_id: &str,
    visibility_override: Option<bool>,
) -> Result<(), String> {
    let user: Option<(String, Option<String>)> =
        sqlx::query_as("SELECT mc_uuid, mc_name FROM users WHERE id = ?")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    let Some((mc_uuid, mc_name)) = user else {
        return Ok(());
    };

    let manual: (Option<f64>, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT SUM(amount), MIN(donated_at), MAX(donated_at) FROM donations WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let afdian: Option<(f64, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT
            all_sum_amount,
            CASE
                WHEN first_pay_time IS NOT NULL THEN datetime(first_pay_time, 'unixepoch')
                ELSE NULL
            END,
            CASE
                WHEN last_pay_time IS NOT NULL THEN datetime(last_pay_time, 'unixepoch')
                ELSE NULL
            END
         FROM afdian_sponsors
         WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let manual_total = manual.0.unwrap_or(0.0);
    let afdian_total = afdian.as_ref().map(|row| row.0).unwrap_or(0.0);
    let started_at = min_optional_datetime(
        manual.1.as_deref(),
        afdian.as_ref().and_then(|row| row.1.as_deref()),
    );
    let last_donated_at = max_optional_datetime(
        manual.2.as_deref(),
        afdian.as_ref().and_then(|row| row.2.as_deref()),
    );

    let existing_visible: Option<(i64,)> =
        sqlx::query_as("SELECT is_visible FROM historical_donors WHERE user_id = ?")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    let is_visible = visibility_override
        .unwrap_or_else(|| existing_visible.map(|row| row.0 != 0).unwrap_or(true));

    sqlx::query(
        "INSERT INTO historical_donors
            (user_id, mc_uuid, mc_name, total_amount, started_at, last_donated_at, is_visible, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
            mc_uuid = excluded.mc_uuid,
            mc_name = excluded.mc_name,
            total_amount = excluded.total_amount,
            started_at = excluded.started_at,
            last_donated_at = excluded.last_donated_at,
            is_visible = excluded.is_visible,
            updated_at = CURRENT_TIMESTAMP",
    )
    .bind(user_id)
    .bind(&mc_uuid)
    .bind(&mc_name)
    .bind(manual_total + afdian_total)
    .bind(started_at)
    .bind(last_donated_at)
    .bind(is_visible)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn get_afdian_binding(
    pool: &SqlitePool,
    user_id: &str,
) -> Result<DonorAfdianBindingResponse, String> {
    let afdian_user_id: Option<(Option<String>,)> =
        sqlx::query_as("SELECT afdian_user_id FROM users WHERE id = ?")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    let sponsor = sqlx::query_as::<_, AfdianSponsorSnapshot>(
        "SELECT user_id, all_sum_amount, first_pay_time, last_pay_time, synced_at
         FROM afdian_sponsors
         WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(DonorAfdianBindingResponse {
        afdian_user_id: afdian_user_id.and_then(|row| row.0),
        sponsor,
    })
}

pub async fn update_afdian_binding(
    pool: &SqlitePool,
    user_id: &str,
    afdian_user_id: Option<String>,
) -> Result<DonorAfdianBindingResponse, String> {
    let cleaned = clean_optional_text(afdian_user_id);

    sqlx::query("UPDATE users SET afdian_user_id = ? WHERE id = ?")
        .bind(&cleaned)
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM afdian_sponsors WHERE user_id = ?")
        .bind(user_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    refresh_historical_donor(pool, user_id, None).await?;

    get_afdian_binding(pool, user_id).await
}

pub async fn sync_afdian_sponsor_for_user(
    pool: &SqlitePool,
    user_id: &str,
) -> Result<DonorAfdianBindingResponse, String> {
    let bound: Option<(Option<String>,)> =
        sqlx::query_as("SELECT afdian_user_id FROM users WHERE id = ?")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

    let Some((Some(afdian_user_id),)) = bound else {
        return Err("This user is not bound to an Afdian user_id yet.".to_string());
    };

    let config = load_afdian_runtime_config(pool).await?;
    let Some(config) = config else {
        return Err("Afdian token is not configured.".to_string());
    };

    let sponsor = query_afdian_sponsor(&config, &afdian_user_id).await?;
    let Some(sponsor) = sponsor else {
        return Err("The bound Afdian user_id was not found in sponsor records.".to_string());
    };

    sqlx::query(
        "INSERT INTO afdian_sponsors (user_id, all_sum_amount, first_pay_time, last_pay_time, synced_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
            all_sum_amount = excluded.all_sum_amount,
            first_pay_time = excluded.first_pay_time,
            last_pay_time = excluded.last_pay_time,
            synced_at = CURRENT_TIMESTAMP",
    )
    .bind(user_id)
    .bind(sponsor.all_sum_amount)
    .bind(sponsor.first_pay_time)
    .bind(sponsor.last_pay_time)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    refresh_historical_donor(pool, user_id, None).await?;

    get_afdian_binding(pool, user_id).await
}

pub async fn get_afdian_config(pool: &SqlitePool) -> Result<AfdianConfigResponse, String> {
    let row: Option<(Option<String>, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT creator_user_id, token_preview, updated_at FROM afdian_config WHERE id = 'default'",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let Some((creator_user_id, token_preview, updated_at)) = row else {
        return Ok(AfdianConfigResponse {
            creator_user_id: None,
            has_token: false,
            token_preview: None,
            updated_at: None,
        });
    };

    Ok(AfdianConfigResponse {
        creator_user_id,
        has_token: token_preview.is_some(),
        token_preview,
        updated_at,
    })
}

pub async fn save_afdian_config(
    pool: &SqlitePool,
    payload: AfdianConfigPayload,
) -> Result<AfdianConfigResponse, String> {
    let creator_user_id = payload.creator_user_id.trim();
    if creator_user_id.is_empty() {
        return Err("Afdian creator user_id cannot be empty.".to_string());
    }

    let existing: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT token_encrypted, token_preview FROM afdian_config WHERE id = 'default'",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let incoming_token = clean_optional_text(payload.token);
    let token_encrypted = match incoming_token.as_deref() {
        Some(token) => Some(encrypt_secret(token)?),
        None => existing.as_ref().and_then(|row| row.0.clone()),
    };

    let Some(token_encrypted) = token_encrypted else {
        return Err("The first Afdian save must include a token.".to_string());
    };

    let token_preview = incoming_token
        .as_deref()
        .map(mask_secret)
        .or_else(|| existing.and_then(|row| row.1))
        .unwrap_or_else(|| "configured".to_string());

    sqlx::query(
        "INSERT INTO afdian_config (id, creator_user_id, token_encrypted, token_preview, updated_at)
         VALUES ('default', ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
            creator_user_id = excluded.creator_user_id,
            token_encrypted = excluded.token_encrypted,
            token_preview = excluded.token_preview,
            updated_at = CURRENT_TIMESTAMP",
    )
    .bind(creator_user_id)
    .bind(token_encrypted)
    .bind(token_preview)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    get_afdian_config(pool).await
}

async fn fetch_mojang_name(uuid: &str) -> Result<Option<String>, String> {
    let response = reqwest::get(format!(
        "https://sessionserver.mojang.com/session/minecraft/profile/{uuid}"
    ))
    .await
    .map_err(|e| e.to_string())?;

    match response.status() {
        reqwest::StatusCode::OK => {
            let profile = response
                .json::<MojangProfileResponse>()
                .await
                .map_err(|e| e.to_string())?;
            Ok(Some(profile.name))
        }
        reqwest::StatusCode::NOT_FOUND | reqwest::StatusCode::NO_CONTENT => Ok(None),
        status => Err(format!("Mojang lookup failed: {status}")),
    }
}

async fn load_afdian_runtime_config(
    pool: &SqlitePool,
) -> Result<Option<AfdianRuntimeConfig>, String> {
    let row: Option<(Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT creator_user_id, token_encrypted FROM afdian_config WHERE id = 'default'",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let Some((Some(creator_user_id), Some(token_encrypted))) = row else {
        return Ok(None);
    };

    Ok(Some(AfdianRuntimeConfig {
        creator_user_id,
        token: decrypt_secret(&token_encrypted)?,
    }))
}

async fn query_afdian_sponsor(
    config: &AfdianRuntimeConfig,
    sponsor_user_id: &str,
) -> Result<Option<AfdianSponsorSnapshot>, String> {
    let direct = post_afdian_sponsor_query(config, json!({ "user_id": sponsor_user_id })).await?;
    if let Some(found) = find_sponsor_in_list(&direct.list, sponsor_user_id) {
        return Ok(Some(found));
    }

    let first_page = post_afdian_sponsor_query(config, json!({ "page": 1 })).await?;
    if let Some(found) = find_sponsor_in_list(&first_page.list, sponsor_user_id) {
        return Ok(Some(found));
    }

    let total_page = first_page.total_page.unwrap_or(1).max(1);
    for page in 2..=total_page {
        let page_data = post_afdian_sponsor_query(config, json!({ "page": page })).await?;
        if let Some(found) = find_sponsor_in_list(&page_data.list, sponsor_user_id) {
            return Ok(Some(found));
        }
    }

    Ok(None)
}

async fn post_afdian_sponsor_query(
    config: &AfdianRuntimeConfig,
    params: serde_json::Value,
) -> Result<AfdianSponsorListData, String> {
    let params_str = serde_json::to_string(&params).map_err(|e| e.to_string())?;
    let ts = now_unix();
    let sign = sign_afdian_request(&config.token, &params_str, ts, &config.creator_user_id);

    let response = reqwest::Client::new()
        .post("https://afdian.net/api/open/query-sponsor")
        .json(&json!({
            "user_id": config.creator_user_id,
            "params": params_str,
            "ts": ts,
            "sign": sign,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body = response
        .json::<AfdianApiResponse<AfdianSponsorListData>>()
        .await
        .map_err(|e| e.to_string())?;

    if body.ec != 200 {
        let message = if body.em.trim().is_empty() {
            "Afdian API returned an unexpected response.".to_string()
        } else {
            body.em
        };
        return Err(message);
    }

    Ok(body.data)
}

fn find_sponsor_in_list(
    list: &[AfdianSponsorItem],
    sponsor_user_id: &str,
) -> Option<AfdianSponsorSnapshot> {
    list.iter()
        .find(|item| item.user.user_id == sponsor_user_id)
        .map(to_sponsor_snapshot)
}

fn to_sponsor_snapshot(item: &AfdianSponsorItem) -> AfdianSponsorSnapshot {
    AfdianSponsorSnapshot {
        user_id: item.user.user_id.clone(),
        all_sum_amount: item.all_sum_amount.parse::<f64>().unwrap_or(0.0),
        first_pay_time: item.first_pay_time.or(item.create_time),
        last_pay_time: item.last_pay_time,
        synced_at: None,
    }
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn sign_afdian_request(token: &str, params: &str, ts: i64, user_id: &str) -> String {
    let payload = format!("{token}params{params}ts{ts}user_id{user_id}");
    let digest = Md5::digest(payload.as_bytes());
    format!("{digest:x}")
}

fn min_optional_datetime(left: Option<&str>, right: Option<&str>) -> Option<String> {
    match (left, right) {
        (Some(a), Some(b)) => Some(if a <= b { a } else { b }.to_string()),
        (Some(a), None) => Some(a.to_string()),
        (None, Some(b)) => Some(b.to_string()),
        (None, None) => None,
    }
}

fn max_optional_datetime(left: Option<&str>, right: Option<&str>) -> Option<String> {
    match (left, right) {
        (Some(a), Some(b)) => Some(if a >= b { a } else { b }.to_string()),
        (Some(a), None) => Some(a.to_string()),
        (None, Some(b)) => Some(b.to_string()),
        (None, None) => None,
    }
}

fn mask_secret(secret: &str) -> String {
    let trimmed = secret.trim();
    if trimmed.len() <= 8 {
        return "*".repeat(trimmed.len().max(4));
    }

    format!("{}****{}", &trimmed[..4], &trimmed[trimmed.len() - 4..])
}

fn encryption_secret() -> Result<String, String> {
    std::env::var("DATA_ENCRYPTION_KEY")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| {
            std::env::var("JWT_SECRET")
                .ok()
                .filter(|value| !value.trim().is_empty())
        })
        .ok_or_else(|| {
            "Missing DATA_ENCRYPTION_KEY or JWT_SECRET env var; cannot safely store the Afdian token."
                .to_string()
        })
}

fn derive_aead_key() -> Result<LessSafeKey, String> {
    let secret = encryption_secret()?;
    let digest = Sha256::digest(secret.as_bytes());
    let unbound = UnboundKey::new(&aead::CHACHA20_POLY1305, digest.as_ref())
        .map_err(|_| "Failed to initialize the token cipher.".to_string())?;
    Ok(LessSafeKey::new(unbound))
}

fn encrypt_secret(plain: &str) -> Result<String, String> {
    let key = derive_aead_key()?;
    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes)
        .map_err(|_| "Failed to generate a random nonce.".to_string())?;

    let nonce = Nonce::assume_unique_for_key(nonce_bytes);
    let mut buffer = plain.as_bytes().to_vec();
    key.seal_in_place_append_tag(nonce, Aad::empty(), &mut buffer)
        .map_err(|_| "Failed to encrypt the token.".to_string())?;

    let mut packed = nonce_bytes.to_vec();
    packed.extend_from_slice(&buffer);
    Ok(BASE64.encode(packed))
}

fn decrypt_secret(cipher_text: &str) -> Result<String, String> {
    let key = derive_aead_key()?;
    let packed = BASE64
        .decode(cipher_text)
        .map_err(|_| "Failed to decode the encrypted token.".to_string())?;

    if packed.len() <= 12 {
        return Err("Encrypted token payload is invalid.".to_string());
    }

    let mut nonce_bytes = [0u8; 12];
    nonce_bytes.copy_from_slice(&packed[..12]);
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);
    let mut cipher = packed[12..].to_vec();

    let plain = key
        .open_in_place(nonce, Aad::empty(), &mut cipher)
        .map_err(|_| {
            "Failed to decrypt the token. Check whether DATA_ENCRYPTION_KEY/JWT_SECRET changed."
                .to_string()
        })?;

    String::from_utf8(plain.to_vec())
        .map_err(|_| "The decrypted token is not valid UTF-8.".to_string())
}

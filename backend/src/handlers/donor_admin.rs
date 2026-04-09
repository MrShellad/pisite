use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use serde::Deserialize;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
use uuid::Uuid;

use crate::{
    donor_support::{
        clean_optional_text, fetch_donor_user, get_afdian_binding as load_afdian_binding,
        get_afdian_config as load_afdian_config, normalize_mc_uuid, refresh_historical_donor,
        save_afdian_config, sync_afdian_sponsor_for_user, sync_user_mojang_profile,
        update_afdian_binding as save_afdian_binding,
    },
    models::{
        Activation, AfdianConfigPayload, AfdianConfigResponse, Claims, Device, Donation,
        DonorAddDonationPayload, DonorAfdianBindingPayload, DonorAfdianBindingResponse,
        DonorUpsertLicensePayload, DonorUpsertUserPayload, DonorUser, License,
    },
};

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ListUsersQuery {
    #[serde(default, alias = "q")]
    pub search: Option<String>,
}

pub async fn list_users(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Query(query): Query<ListUsersQuery>,
) -> Result<Json<Vec<DonorUser>>, (StatusCode, String)> {
    let mut builder = QueryBuilder::<Sqlite>::new(
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
         WHERE 1 = 1",
    );

    if let Some(search) = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let like = format!("%{}%", search.to_lowercase());
        builder
            .push(" AND (LOWER(u.mc_uuid) LIKE ")
            .push_bind(like.clone())
            .push(" OR LOWER(COALESCE(u.mc_name, '')) LIKE ")
            .push_bind(like.clone())
            .push(" OR LOWER(COALESCE(u.email, '')) LIKE ")
            .push_bind(like.clone())
            .push(" OR LOWER(COALESCE(u.afdian_user_id, '')) LIKE ")
            .push_bind(like)
            .push(")");
    }

    builder.push(
        " ORDER BY COALESCE(hd.last_donated_at, hd.started_at, u.created_at) DESC, u.created_at DESC",
    );

    let users = builder
        .build_query_as::<DonorUser>()
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(users))
}

pub async fn create_user(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<DonorUpsertUserPayload>,
) -> Result<Json<DonorUser>, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    let mc_uuid = normalize_mc_uuid(&payload.mc_uuid)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let email = clean_optional_text(payload.email);
    let is_visible = payload.is_visible.unwrap_or(true);

    sqlx::query("INSERT INTO users (id, mc_uuid, email) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&mc_uuid)
        .bind(&email)
        .execute(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::BAD_REQUEST,
                format!("Failed to create user: {e}"),
            )
        })?;

    let _ = sync_user_mojang_profile(&pool, &id).await;
    refresh_historical_donor(&pool, &id, Some(is_visible))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let user = fetch_donor_user(&pool, &id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(user))
}

pub async fn update_user(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<DonorUpsertUserPayload>,
) -> Result<Json<DonorUser>, (StatusCode, String)> {
    let mc_uuid = normalize_mc_uuid(&payload.mc_uuid)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let email = clean_optional_text(payload.email);

    let result =
        sqlx::query("UPDATE users SET mc_uuid = ?, mc_name = NULL, email = ? WHERE id = ?")
            .bind(&mc_uuid)
            .bind(&email)
            .bind(&id)
            .execute(&pool)
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "User not found.".to_string()));
    }

    let _ = sync_user_mojang_profile(&pool, &id).await;
    refresh_historical_donor(&pool, &id, payload.is_visible)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let user = fetch_donor_user(&pool, &id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(user))
}

pub async fn delete_user(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_license(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<Option<License>>, (StatusCode, String)> {
    let lic = sqlx::query_as::<_, License>(
        "SELECT * FROM licenses WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
    )
    .bind(&user_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(lic))
}

pub async fn upsert_license(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
    Json(payload): Json<DonorUpsertLicensePayload>,
) -> Result<Json<License>, (StatusCode, String)> {
    let existing: Option<(String,)> =
        sqlx::query_as("SELECT id FROM licenses WHERE user_id = ? LIMIT 1")
            .bind(&user_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let id = if let Some((id,)) = existing {
        sqlx::query(
            "UPDATE licenses
             SET tier = ?, is_beta_enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?",
        )
        .bind(&payload.tier)
        .bind(payload.is_beta_enabled)
        .bind(&payload.status)
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        id
    } else {
        let id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO licenses (id, user_id, tier, is_beta_enabled, status)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&user_id)
        .bind(&payload.tier)
        .bind(payload.is_beta_enabled)
        .bind(&payload.status)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        id
    };

    let lic = sqlx::query_as::<_, License>("SELECT * FROM licenses WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(lic))
}

pub async fn list_donations(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Donation>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, Donation>(
        "SELECT * FROM donations WHERE user_id = ? ORDER BY donated_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn add_donation(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<DonorAddDonationPayload>,
) -> Result<Json<Donation>, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO donations (id, user_id, amount, currency, donated_at)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&payload.user_id)
    .bind(payload.amount)
    .bind(&payload.currency)
    .bind(&payload.donated_at)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    refresh_historical_donor(&pool, &payload.user_id, None)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let row = sqlx::query_as::<_, Donation>("SELECT * FROM donations WHERE id = ?")
        .bind(&id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(row))
}

pub async fn list_devices(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Device>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, Device>(
        "SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn toggle_device_active(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE devices SET is_active = NOT is_active WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

pub async fn list_activations(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Activation>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, Activation>(
        "SELECT * FROM activations WHERE user_id = ? ORDER BY issued_at DESC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(rows))
}

pub async fn sync_mojang_profile(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<DonorUser>, (StatusCode, String)> {
    sync_user_mojang_profile(&pool, &user_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let user = fetch_donor_user(&pool, &user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(user))
}

pub async fn get_afdian_binding(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<DonorAfdianBindingResponse>, (StatusCode, String)> {
    let binding = load_afdian_binding(&pool, &user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(binding))
}

pub async fn update_afdian_binding(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
    Json(payload): Json<DonorAfdianBindingPayload>,
) -> Result<Json<DonorAfdianBindingResponse>, (StatusCode, String)> {
    let binding = save_afdian_binding(&pool, &user_id, payload.afdian_user_id)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(binding))
}

pub async fn sync_afdian_binding(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<String>,
) -> Result<Json<DonorAfdianBindingResponse>, (StatusCode, String)> {
    let binding = sync_afdian_sponsor_for_user(&pool, &user_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;
    Ok(Json(binding))
}

pub async fn get_afdian_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<AfdianConfigResponse>, (StatusCode, String)> {
    let config = load_afdian_config(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(config))
}

pub async fn update_afdian_config(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<AfdianConfigPayload>,
) -> Result<Json<AfdianConfigResponse>, (StatusCode, String)> {
    let config = save_afdian_config(&pool, payload)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(config))
}

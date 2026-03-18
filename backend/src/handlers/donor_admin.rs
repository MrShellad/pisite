use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{
    Activation, Claims, Device, Donation, DonorAddDonationPayload, DonorUpsertLicensePayload,
    DonorUpsertUserPayload, DonorUser, License,
};

pub async fn list_users(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<DonorUser>>, (StatusCode, String)> {
    let users = sqlx::query_as::<_, DonorUser>(
        "SELECT id, mc_uuid, email, created_at FROM users ORDER BY created_at DESC",
    )
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
    sqlx::query("INSERT INTO users (id, mc_uuid, email) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&payload.mc_uuid)
        .bind(&payload.email)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("创建失败: {}", e)))?;

    let user = sqlx::query_as::<_, DonorUser>(
        "SELECT id, mc_uuid, email, created_at FROM users WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(user))
}

pub async fn update_user(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(payload): Json<DonorUpsertUserPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE users SET mc_uuid = ?, email = ? WHERE id = ?")
        .bind(&payload.mc_uuid)
        .bind(&payload.email)
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    Ok(StatusCode::OK)
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
            "UPDATE licenses SET tier = ?, is_beta_enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
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
            "INSERT INTO licenses (id, user_id, tier, is_beta_enabled, status) VALUES (?, ?, ?, ?, ?)"
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
        "INSERT INTO donations (id, user_id, amount, currency, donated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&payload.user_id)
    .bind(payload.amount)
    .bind(&payload.currency)
    .bind(&payload.donated_at)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

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

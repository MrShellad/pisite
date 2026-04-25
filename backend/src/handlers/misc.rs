use crate::models::{Claims, FriendLink, FriendLinkPayload};
use axum::{Json, extract::State, http::StatusCode};
use sqlx::SqlitePool;
use uuid::Uuid;

pub async fn get_friends(State(pool): State<SqlitePool>) -> Json<Vec<FriendLink>> {
    let friends = sqlx::query_as::<_, FriendLink>(
        "SELECT id, name, href, sort_order, enabled
         FROM friend_links
         WHERE enabled = 1
         ORDER BY sort_order ASC, name COLLATE NOCASE ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(friends)
}

pub async fn get_admin_friends(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Json<Vec<FriendLink>> {
    let friends = sqlx::query_as::<_, FriendLink>(
        "SELECT id, name, href, sort_order, enabled
         FROM friend_links
         ORDER BY sort_order ASC, name COLLATE NOCASE ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Json(friends)
}

pub async fn update_admin_friends(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<Vec<FriendLinkPayload>>,
) -> Result<StatusCode, (StatusCode, String)> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("DELETE FROM friend_links")
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for (index, item) in payload.iter().enumerate() {
        let name = item.name.trim();
        let href = item.href.trim();

        if name.is_empty() || href.is_empty() {
            continue;
        }

        let id = item
            .id
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        sqlx::query(
            "INSERT INTO friend_links (id, name, href, sort_order, enabled)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(name)
        .bind(href)
        .bind(index as i32)
        .bind(item.enabled)
        .execute(&mut *tx)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    tx.commit()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

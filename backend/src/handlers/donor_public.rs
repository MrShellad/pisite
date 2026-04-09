use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde::Deserialize;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};

use crate::models::PublicHistoricalDonor;

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PublicDonorQuery {
    #[serde(default, alias = "q")]
    pub search: Option<String>,
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub offset: Option<i64>,
}

pub async fn list_public_supporters(
    State(pool): State<SqlitePool>,
    Query(query): Query<PublicDonorQuery>,
) -> Result<Json<Vec<PublicHistoricalDonor>>, (StatusCode, String)> {
    let mut builder = QueryBuilder::<Sqlite>::new(
        "SELECT
            mc_uuid,
            mc_name,
            total_amount,
            started_at,
            last_donated_at
         FROM historical_donors
         WHERE is_visible = 1 AND total_amount > 0",
    );

    if let Some(search) = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let like = format!("%{}%", search.to_lowercase());
        builder
            .push(" AND (LOWER(mc_uuid) LIKE ")
            .push_bind(like.clone())
            .push(" OR LOWER(COALESCE(mc_name, '')) LIKE ")
            .push_bind(like)
            .push(")");
    }

    let limit = query.limit.unwrap_or(100).clamp(1, 500);
    let offset = query.offset.unwrap_or(0).max(0);

    builder
        .push(" ORDER BY COALESCE(last_donated_at, started_at, updated_at) DESC")
        .push(" LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);

    let items = builder
        .build_query_as::<PublicHistoricalDonor>()
        .fetch_all(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(items))
}

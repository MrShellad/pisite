use axum::{Json, extract::State};
use serde::Serialize;
use sqlx::SqlitePool;

use crate::models::{HeroConfig, SiteSettings};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeLatestRelease {
    pub version: String,
    pub date: String,
    pub platforms: serde_json::Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeBootstrap {
    pub settings: SiteSettings,
    pub hero: HeroConfig,
    pub latest_release: Option<HomeLatestRelease>,
}

pub async fn get_home_bootstrap(State(pool): State<SqlitePool>) -> Json<HomeBootstrap> {
    let settings = sqlx::query_as::<_, SiteSettings>("SELECT * FROM site_settings WHERE id = '1'")
        .fetch_one(&pool)
        .await
        .unwrap();

    let hero = sqlx::query_as::<_, HeroConfig>("SELECT * FROM hero_config WHERE id = '1'")
        .fetch_one(&pool)
        .await
        .unwrap();

    let latest_release = sqlx::query_as::<_, (String, String, String)>(
        "SELECT display_version, date, platforms_json FROM app_releases WHERE status = 'active' ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or_default()
    .map(|(version, date, platforms_json)| HomeLatestRelease {
        version,
        date,
        platforms: serde_json::from_str(&platforms_json).unwrap_or_else(|_| serde_json::json!({})),
    });

    Json(HomeBootstrap {
        settings,
        hero,
        latest_release,
    })
}

// backend/src/handlers/changelog.rs
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use semver::Version;
use sqlx::SqlitePool;
use uuid::Uuid;

// 引入所需的模型结构
use crate::models::{
    AppReleaseRow, ChangeItem, ChangelogEntry, Claims, PublishReleasePayload, UpdaterParams,
};

// ==================== 1. 前台公开接口 (恢复补充) ====================

// 获取所有活跃版本，供官网前台展示更新日志
pub async fn get_changelog(State(pool): State<SqlitePool>) -> Json<Vec<ChangelogEntry>> {
    // 只拉取状态为 active (非回滚) 的版本
    let rows = sqlx::query_as::<_, AppReleaseRow>(
        "SELECT * FROM app_releases WHERE status = 'active' ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // 将数据库的发行实体映射为前端期望的 ChangelogEntry
    let entries: Vec<ChangelogEntry> = rows
        .into_iter()
        .enumerate()
        .map(|(i, row)| {
            let changes: Vec<ChangeItem> =
                serde_json::from_str(&row.changes_json).unwrap_or_default();
            ChangelogEntry {
                id: row.id,
                version: row.display_version,
                date: row.date,
                is_latest: i == 0, // 最上面那条就是最新版
                changes,
            }
        })
        .collect();

    Json(entries)
}

// ==================== 2. Tauri 动态分发引擎 ====================

fn platform_has_assets(platform: &serde_json::Value) -> bool {
    let url = platform
        .get("url")
        .and_then(|value| value.as_str())
        .unwrap_or_default();
    let signature = platform
        .get("signature")
        .and_then(|value| value.as_str())
        .unwrap_or_default();

    !url.is_empty() && !signature.is_empty()
}

fn find_requested_platform<'a>(
    platforms: &'a serde_json::Value,
    target: Option<&str>,
) -> Option<&'a serde_json::Value> {
    match target {
        Some("windows") => platforms.get("windows").filter(|platform| platform_has_assets(platform)),
        Some("darwin") => platforms.get("darwin").filter(|platform| platform_has_assets(platform)),
        Some("linux") => platforms.get("linux").filter(|platform| platform_has_assets(platform)),
        _ => None,
    }
}

fn build_updater_platforms(
    platforms: &serde_json::Value,
) -> serde_json::Map<String, serde_json::Value> {
    let mut mapped = serde_json::Map::new();

    if let Some(platform) = platforms.get("darwin").filter(|platform| platform_has_assets(platform))
    {
        mapped.insert("darwin-x86_64".to_string(), platform.clone());
        mapped.insert("darwin-aarch64".to_string(), platform.clone());
    }

    if let Some(platform) = platforms.get("windows").filter(|platform| platform_has_assets(platform))
    {
        mapped.insert("windows-x86_64".to_string(), platform.clone());
    }

    if let Some(platform) = platforms.get("linux").filter(|platform| platform_has_assets(platform))
    {
        mapped.insert("linux-x86_64".to_string(), platform.clone());
    }

    mapped
}

fn build_release_notes(changes: Vec<serde_json::Value>) -> String {
    let mut notes = String::new();

    for change in changes {
        if let Some(text) = change.get("text").and_then(|t| t.as_str()) {
            notes.push_str(&format!("- {}\n", text));
        }
    }

    if notes.is_empty() {
        "Routine improvements and fixes".to_string()
    } else {
        notes
    }
}

pub async fn tauri_updater(
    Query(params): Query<UpdaterParams>,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let active_releases = sqlx::query_as::<_, AppReleaseRow>(
        "SELECT * FROM app_releases WHERE status = 'active' ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let client_version = Version::parse(&params.version).unwrap_or(Version::new(0, 0, 0));
    let client_uuid = params.uuid.unwrap_or_default();
    let client_region = params.region.unwrap_or_default();
    let requested_format = params.format.as_deref();
    let expected_version = params.expected_version.as_deref();

    for release in active_releases {
        let release_version = Version::parse(&release.version).unwrap_or(Version::new(0, 0, 0));
        if release_version <= client_version {
            continue;
        }

        if let Some(expected_version) = expected_version {
            if release.version != expected_version {
                continue;
            }
        }

        if release.allowed_regions != "ALL" && !release.allowed_regions.contains(&client_region) {
            continue;
        }

        let mut matched = false;
        match release.rollout_type.as_str() {
            "all" => matched = true,
            "targeted" => {
                if release.rollout_value.contains(&client_uuid) {
                    matched = true;
                }
            }
            "grayscale" => {
                let hash_val: u32 = client_uuid.bytes().map(|b| b as u32).sum();
                let percentage = release.rollout_value.parse::<u32>().unwrap_or(0);
                if (hash_val % 100) < percentage {
                    matched = true;
                }
            }
            _ => {}
        }

        if matched {
            let platforms: serde_json::Value =
                serde_json::from_str(&release.platforms_json).unwrap_or(serde_json::json!({}));
            let requested_platform = find_requested_platform(&platforms, params.target.as_deref());
            if params.target.is_some() && requested_platform.is_none() {
                continue;
            }

            let updater_platforms = build_updater_platforms(&platforms);
            if updater_platforms.is_empty() {
                continue;
            }

            let changes: Vec<serde_json::Value> =
                serde_json::from_str(&release.changes_json).unwrap_or_default();
            let notes = build_release_notes(changes);

            if requested_format == Some("dynamic") {
                let Some(platform) = requested_platform else {
                    continue;
                };

                let response = serde_json::json!({
                    "version": release.version,
                    "notes": notes,
                    "pub_date": format!("{}T00:00:00Z", release.date),
                    "url": platform.get("url").and_then(|value| value.as_str()).unwrap_or_default(),
                    "signature": platform.get("signature").and_then(|value| value.as_str()).unwrap_or_default(),
                });

                return Ok(Json(response).into_response());
            }

            let response = serde_json::json!({
                "version": release.version,
                "notes": notes,
                "pub_date": format!("{}T00:00:00Z", release.date),
                "platforms": updater_platforms
            });

            return Ok(Json(response).into_response());
        }
    }

    Ok(StatusCode::NO_CONTENT.into_response())
}

// ==================== 3. 后台控制台接口 (Admin) ====================

// 获取所有版本历史 (包含已回滚的)
pub async fn get_admin_changelogs(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Json<serde_json::Value> {
    let rows =
        sqlx::query_as::<_, AppReleaseRow>("SELECT * FROM app_releases ORDER BY created_at DESC")
            .fetch_all(&pool)
            .await
            .unwrap_or_default();

    let result: Vec<serde_json::Value> = rows.into_iter().map(|row| {
        serde_json::json!({
            "id": row.id,
            "version": row.display_version,
            "date": row.date,
            "channel": row.channel,
            "rolloutType": row.rollout_type,
            "rolloutValue": row.rollout_value,
            "status": row.status,
            "changes": serde_json::from_str::<serde_json::Value>(&row.changes_json).unwrap_or_default()
        })
    }).collect();

    Json(serde_json::json!(result))
}

// 发布新版本
pub async fn add_changelog(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<PublishReleasePayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    let platforms_str = serde_json::to_string(&payload.platforms).unwrap_or_default();
    let changes_str = serde_json::to_string(&payload.changes).unwrap_or_default();

    sqlx::query(
        "INSERT INTO app_releases (id, version, display_version, date, channel, rollout_type, rollout_value, allowed_regions, status, platforms_json, changes_json) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)"
    )
    .bind(id).bind(payload.version_id).bind(payload.display_version).bind(payload.date)
    .bind(payload.channel).bind(payload.rollout_type).bind(payload.rollout_value)
    .bind(payload.allowed_regions).bind(platforms_str).bind(changes_str)
    .execute(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::CREATED)
}

// 撤回/回滚版本 (改变状态即可)
pub async fn rollback_changelog(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE app_releases SET status = 'rollback' WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

// 物理删除版本日志
pub async fn delete_changelog(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM app_releases WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

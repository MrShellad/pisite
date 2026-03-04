// backend/src/handlers/changelog.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::SqlitePool;
use uuid::Uuid;
use semver::Version;

// 引入所需的模型结构
use crate::models::{
    AppReleaseRow, ChangeItem, ChangelogEntry, Claims, PublishReleasePayload, UpdaterParams,
};

// ==================== 1. 前台公开接口 (恢复补充) ====================

// 获取所有活跃版本，供官网前台展示更新日志
pub async fn get_changelog(State(pool): State<SqlitePool>) -> Json<Vec<ChangelogEntry>> {
    // 只拉取状态为 active (非回滚) 的版本
    let rows = sqlx::query_as::<_, AppReleaseRow>(
        "SELECT * FROM app_releases WHERE status = 'active' ORDER BY created_at DESC"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    
    // 将数据库的发行实体映射为前端期望的 ChangelogEntry
    let entries: Vec<ChangelogEntry> = rows.into_iter().enumerate().map(|(i, row)| {
        let changes: Vec<ChangeItem> = serde_json::from_str(&row.changes_json).unwrap_or_default();
        ChangelogEntry {
            id: row.id,
            version: row.display_version,
            date: row.date,
            is_latest: i == 0, // 最上面那条就是最新版
            changes,
        }
    }).collect();
    
    Json(entries)
}

// ==================== 2. Tauri 动态分发引擎 ====================

pub async fn tauri_updater(
    Query(params): Query<UpdaterParams>,
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    
    let active_releases = sqlx::query_as::<_, AppReleaseRow>(
        "SELECT * FROM app_releases WHERE status = 'active' ORDER BY created_at DESC"
    ).fetch_all(&pool).await.unwrap_or_default();

    let client_version = Version::parse(&params.version).unwrap_or(Version::new(0, 0, 0));
    let client_uuid = params.uuid.unwrap_or_default();
    let client_region = params.region.unwrap_or_default();

    for release in active_releases {
        let release_version = Version::parse(&release.version).unwrap_or(Version::new(0, 0, 0));
        if release_version <= client_version { continue; }

        if release.allowed_regions != "ALL" && !release.allowed_regions.contains(&client_region) {
            continue;
        }

        let mut matched = false;
        match release.rollout_type.as_str() {
            "all" => matched = true,
            "targeted" => {
                if release.rollout_value.contains(&client_uuid) { matched = true; }
            },
            "grayscale" => {
                let hash_val: u32 = client_uuid.bytes().map(|b| b as u32).sum();
                let percentage = release.rollout_value.parse::<u32>().unwrap_or(0);
                if (hash_val % 100) < percentage { matched = true; }
            },
            _ => {}
        }

        if matched {
            let platforms: serde_json::Value = serde_json::from_str(&release.platforms_json).unwrap_or(serde_json::json!({}));
            
            let changes: Vec<serde_json::Value> = serde_json::from_str(&release.changes_json).unwrap_or_default();
            let mut notes = String::new();
            for change in changes {
                if let Some(text) = change.get("text").and_then(|t| t.as_str()) {
                    notes.push_str(&format!("- {}\n", text));
                }
            }

            let response = serde_json::json!({
                "version": release.version,
                "notes": if notes.is_empty() { "常规性能更新与优化".to_string() } else { notes },
                "pub_date": format!("{}T00:00:00Z", release.date),
                "platforms": {
                    "darwin-x86_64": platforms.get("darwin").unwrap_or(&serde_json::json!(null)),
                    "darwin-aarch64": platforms.get("darwin").unwrap_or(&serde_json::json!(null)),
                    "windows-x86_64": platforms.get("windows").unwrap_or(&serde_json::json!(null)),
                    "linux-x86_64": platforms.get("linux").unwrap_or(&serde_json::json!(null)),
                }
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
    State(pool): State<SqlitePool>
) -> Json<serde_json::Value> {
    let rows = sqlx::query_as::<_, AppReleaseRow>("SELECT * FROM app_releases ORDER BY created_at DESC")
        .fetch_all(&pool).await.unwrap_or_default();
    
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
    Json(payload): Json<PublishReleasePayload>
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
    Path(id): Path<String>
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("UPDATE app_releases SET status = 'rollback' WHERE id = ?")
        .bind(id).execute(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

// 物理删除版本日志
pub async fn delete_changelog(
    _claims: Claims, 
    State(pool): State<SqlitePool>, 
    Path(id): Path<String>
) -> Result<StatusCode, (StatusCode, String)> {
    sqlx::query("DELETE FROM app_releases WHERE id = ?")
        .bind(id).execute(&pool).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}
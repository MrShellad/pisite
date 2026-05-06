// backend/src/handlers/stats.rs
use crate::models::{
    ActivationPayload, ActivationResponse, Claims, ClientInstallationReportPayload,
    ClientInstallationReportResponse, ClientInstallationReportRow, DailyStat, DashboardStats,
    DownloadTrackPayload, InstallationPlatformStat, InstallationStatsResponse,
    InstallationVersionStat, InstallationWeekComparisonPoint, PlatformStat,
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use sqlx::SqlitePool;
use uuid::Uuid;

// ==================== 数据追踪与统计模块 ====================

// 1. 记录网页端下载点击
pub async fn track_download(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
    Json(payload): Json<DownloadTrackPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    // 获取真实 IP
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("x-real-ip").and_then(|h| h.to_str().ok()))
        .unwrap_or("unknown")
        .to_string();

    // 写入流水日志
    sqlx::query("INSERT INTO downloads_log (fingerprint, ip, platform) VALUES (?, ?, ?)")
        .bind(payload.fingerprint)
        .bind(ip)
        .bind(payload.platform)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// 2. 客户端 App 首次激活接口
pub async fn activate_app(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
    Json(payload): Json<ActivationPayload>,
) -> Result<Json<ActivationResponse>, (StatusCode, String)> {
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("x-real-ip").and_then(|h| h.to_str().ok()))
        .unwrap_or("unknown")
        .to_string();

    // 为这台设备生成全新的 UUID
    let device_uuid = Uuid::new_v4().to_string();

    // 存入激活数据库
    sqlx::query(
        "INSERT INTO app_activations (device_uuid, platform, ip, os_version) VALUES (?, ?, ?, ?)",
    )
    .bind(&device_uuid)
    .bind(payload.platform)
    .bind(ip)
    .bind(payload.os_version)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 将 UUID 下发给 App
    Ok(Json(ActivationResponse { device_uuid }))
}

pub async fn report_client_installation(
    State(pool): State<SqlitePool>,
    Json(payload): Json<ClientInstallationReportPayload>,
) -> Result<Json<ClientInstallationReportResponse>, (StatusCode, String)> {
    let installation_id = payload.installation_id.trim();
    let platform = payload.platform.trim();
    let gpu = payload.gpu.trim();
    let app_version = payload.app_version.trim();
    let first_installed_at = payload
        .first_installed_at
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if installation_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "installationId is required".to_string(),
        ));
    }
    if installation_id.len() > 128 {
        return Err((
            StatusCode::BAD_REQUEST,
            "installationId is too long".to_string(),
        ));
    }
    if platform.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "platform is required".to_string()));
    }
    if platform.len() > 64 || gpu.len() > 256 || app_version.len() > 64 {
        return Err((
            StatusCode::BAD_REQUEST,
            "payload contains a field that is too long".to_string(),
        ));
    }
    if let Some(memory_bytes) = payload.memory_bytes {
        if memory_bytes < 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                "memoryBytes must be greater than or equal to 0".to_string(),
            ));
        }
    }
    if let Some(value) = first_installed_at {
        if value.len() > 64 {
            return Err((
                StatusCode::BAD_REQUEST,
                "firstInstalledAt is too long".to_string(),
            ));
        }
    }

    let row = sqlx::query_as::<_, ClientInstallationReportResponse>(
        "INSERT INTO client_installation_reports (
            installation_id, platform, memory_bytes, gpu, app_version, first_installed_at, last_reported_at
         ) VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
         ON CONFLICT(installation_id) DO UPDATE SET
            platform = excluded.platform,
            memory_bytes = excluded.memory_bytes,
            gpu = excluded.gpu,
            app_version = excluded.app_version,
            first_installed_at = COALESCE(client_installation_reports.first_installed_at, excluded.first_installed_at),
            last_reported_at = CURRENT_TIMESTAMP
         RETURNING installation_id, platform, memory_bytes, gpu, app_version, first_installed_at, last_reported_at",
    )
    .bind(installation_id)
    .bind(platform)
    .bind(payload.memory_bytes)
    .bind(gpu)
    .bind(app_version)
    .bind(first_installed_at)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(row))
}

// ==================== 仪表盘 (Dashboard) 模块 ====================

pub async fn get_dashboard_stats(
    _claims: Claims, // 必须是登录的管理员
    State(pool): State<SqlitePool>,
) -> Result<Json<DashboardStats>, (StatusCode, String)> {
    // 1. 获取总下载和独立下载 (按设备指纹去重)
    let downloads_count: (i64, i64) =
        sqlx::query_as("SELECT COUNT(*), COUNT(DISTINCT fingerprint) FROM downloads_log")
            .fetch_one(&pool)
            .await
            .unwrap_or((0, 0));

    // 2. 获取总激活量
    let activations_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM app_activations")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    // 3. 按平台统计下载量 (饼图/进度条用)
    let platform_downloads = sqlx::query_as::<_, PlatformStat>(
        "SELECT platform, COUNT(*) as count FROM downloads_log GROUP BY platform ORDER BY count DESC"
    ).fetch_all(&pool).await.unwrap_or_default();

    // 4. 最近 7 天趋势图 (折线图用)
    let daily_trends = sqlx::query_as::<_, DailyStat>(
        "SELECT 
            strftime('%Y-%m-%d', d.created_at) as date,
            COUNT(DISTINCT d.fingerprint) as downloads,
            (SELECT COUNT(*) FROM app_activations a WHERE strftime('%Y-%m-%d', a.activated_at) = strftime('%Y-%m-%d', d.created_at)) as activations
         FROM downloads_log d
         WHERE d.created_at >= date('now', '-7 days')
         GROUP BY date
         ORDER BY date ASC"
    ).fetch_all(&pool).await.unwrap_or_default();

    Ok(Json(DashboardStats {
        total_downloads: downloads_count.0,
        unique_downloads: downloads_count.1,
        total_activations: activations_count.0,
        platform_downloads,
        daily_trends,
    }))
}

pub async fn get_installation_stats(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<InstallationStatsResponse>, (StatusCode, String)> {
    let total_installs: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM client_installation_reports")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));

    let active_this_week: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)
         FROM client_installation_reports
         WHERE datetime(last_reported_at) >= datetime('now', '-7 days')",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0,));

    let new_this_week: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)
         FROM client_installation_reports
         WHERE date(first_installed_at) >= date('now', 'weekday 1', '-7 days')",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0,));

    let new_last_week: (i64,) = sqlx::query_as(
        "SELECT COUNT(*)
         FROM client_installation_reports
         WHERE date(first_installed_at) >= date('now', 'weekday 1', '-14 days')
           AND date(first_installed_at) < date('now', 'weekday 1', '-7 days')",
    )
    .fetch_one(&pool)
    .await
    .unwrap_or((0,));

    let platform_stats = sqlx::query_as::<_, InstallationPlatformStat>(
        "SELECT platform, COUNT(*) AS count
         FROM client_installation_reports
         GROUP BY platform
         ORDER BY count DESC, platform ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let version_stats = sqlx::query_as::<_, InstallationVersionStat>(
        "SELECT
            CASE WHEN app_version = '' THEN 'unknown' ELSE app_version END AS app_version,
            COUNT(*) AS count
         FROM client_installation_reports
         GROUP BY app_version
         ORDER BY count DESC, app_version DESC
         LIMIT 10",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let week_comparison = sqlx::query_as::<_, InstallationWeekComparisonPoint>(
        "WITH RECURSIVE days(day_index, day_date) AS (
            SELECT 0, date('now', 'weekday 1', '-7 days')
            UNION ALL
            SELECT day_index + 1, date(day_date, '+1 day')
            FROM days
            WHERE day_index < 6
         )
         SELECT
            day_index,
            CASE day_index
                WHEN 0 THEN '周一'
                WHEN 1 THEN '周二'
                WHEN 2 THEN '周三'
                WHEN 3 THEN '周四'
                WHEN 4 THEN '周五'
                WHEN 5 THEN '周六'
                ELSE '周日'
            END AS day_label,
            (
                SELECT COUNT(*)
                FROM client_installation_reports r
                WHERE date(r.first_installed_at) = days.day_date
            ) AS this_week,
            (
                SELECT COUNT(*)
                FROM client_installation_reports r
                WHERE date(r.first_installed_at) = date(days.day_date, '-7 days')
            ) AS last_week
         FROM days
         ORDER BY day_index ASC",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let recent_reports = sqlx::query_as::<_, ClientInstallationReportRow>(
        "SELECT installation_id, platform, memory_bytes, gpu, app_version, first_installed_at, last_reported_at
         FROM client_installation_reports
         ORDER BY datetime(last_reported_at) DESC
         LIMIT 500",
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(InstallationStatsResponse {
        total_installs: total_installs.0,
        active_this_week: active_this_week.0,
        new_this_week: new_this_week.0,
        new_last_week: new_last_week.0,
        platform_stats,
        version_stats,
        week_comparison,
        recent_reports,
    }))
}

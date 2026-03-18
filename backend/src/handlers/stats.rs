// backend/src/handlers/stats.rs
use crate::models::{
    ActivationPayload, ActivationResponse, Claims, DailyStat, DashboardStats, DownloadTrackPayload,
    PlatformStat,
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

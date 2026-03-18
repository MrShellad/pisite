use crate::models::{
    Claims, CreateServerSubmissionPayload, ServerSubmission, ServerTagDictPayload,
    UpdateServerSubmissionPayload,
};
use ammonia::clean; // 引入 XSS 清洗库
use axum::{
    Json,
    extract::{Multipart, Path as AxumPath, State},
    http::StatusCode,
};
use regex::Regex;
use sqlx::{SqlitePool, types::Json as SqlxJson};
use std::path::Path;
use uuid::Uuid;
// ================= 1. 上传服务器封面/Icon =================
pub async fn upload_server_cover(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    else {
        return Err((StatusCode::BAD_REQUEST, "No file uploaded".to_string()));
    };

    let original_name = field.file_name().unwrap_or("cover.png");
    let ext = Path::new(original_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("png");
    let file_name = format!("{}.{}", Uuid::new_v4(), ext);
    let relative_path = format!("./uploads/server_covers/{}", file_name);

    tokio::fs::create_dir_all("./uploads/server_covers")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let data = field
        .bytes()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tokio::fs::write(&relative_path, data)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({
        "url": format!("/uploads/server_covers/{}", file_name)
    })))
}

// ================= 2. 提交新服务器 =================
pub async fn create_server_submission(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreateServerSubmissionPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. 【安全防御】XSS 富文本清洗
    let safe_description = clean(&payload.description);
    let safe_name = clean(&payload.name).trim().to_string(); // 普通文本也清洗
    let safe_ip = payload.ip.trim().to_string();

    // 2. 【严格校验】MC版本格式校验 (仅允许 1.20.1 或 26.1 这种数字格式)
    let version_regex = Regex::new(r"^\d+\.\d+(\.\d+)?(-\w+)?$").unwrap();
    if payload.versions.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "至少需要提供一个MC版本".to_string(),
        ));
    }
    for v in &payload.versions {
        if !version_regex.is_match(v) {
            return Err((StatusCode::BAD_REQUEST, format!("MC版本格式不合法: {}", v)));
        }
    }

    // 3. 【严格校验】年龄分级白名单
    let valid_ages = ["全年龄", "12+", "16+", "18+"];
    if !valid_ages.contains(&payload.age_recommendation.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "非法的年龄分级".to_string()));
    }

    let id = Uuid::new_v4().to_string();

    // Sqlx 的 bind 机制原生防御 SQL 注入
    sqlx::query(
        "INSERT INTO server_submissions (
            id, name, description, ip, port, versions, max_players, online_players,
            icon, hero, website, server_type, language, modpack_url, 
            has_paid_content, age_recommendation,
            social_links, has_voice_chat, voice_platform, voice_url,
            features, mechanics, elements, community, tags, verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
    )
    .bind(&id)
    .bind(safe_name)
    .bind(safe_description)
    .bind(safe_ip)
    .bind(payload.port)
    .bind(SqlxJson(&payload.versions))
    .bind(payload.max_players)
    .bind(payload.online_players)
    .bind(payload.icon.trim())
    .bind(payload.hero.trim())
    .bind(payload.website.trim())
    .bind(payload.server_type.trim())
    .bind(payload.language.trim())
    .bind(payload.modpack_url.trim())
    .bind(payload.has_paid_content)
    .bind(&payload.age_recommendation)
    .bind(SqlxJson(&payload.social_links))
    .bind(payload.has_voice_chat)
    .bind(payload.voice_platform.trim())
    .bind(payload.voice_url.trim())
    .bind(SqlxJson(&payload.features))
    .bind(SqlxJson(&payload.mechanics))
    .bind(SqlxJson(&payload.elements))
    .bind(SqlxJson(&payload.community))
    .bind(SqlxJson(&payload.tags))
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        serde_json::json!({ "id": id, "message": "submitted successfully" }),
    ))
}

// ================= 3. 获取所有服务器列表 =================
pub async fn get_all_server_submissions(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<ServerSubmission>>, (StatusCode, String)> {
    // 按照创建时间降序
    let submissions = sqlx::query_as::<_, ServerSubmission>(
        "SELECT * FROM server_submissions ORDER BY datetime(created_at) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(submissions))
}

// ================= 4. 修改服务器信息 =================
pub async fn update_server_submission(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<UpdateServerSubmissionPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        "UPDATE server_submissions
         SET name = ?, description = ?, ip = ?, port = ?, versions = ?, max_players = ?, online_players = ?,
             icon = ?, hero = ?, website = ?, server_type = ?, language = ?, modpack_url = ?, 
             has_paid_content = ?, age_recommendation = ?,
             social_links = ?, has_voice_chat = ?, voice_platform = ?, voice_url = ?,
             features = ?, mechanics = ?, elements = ?, community = ?, tags = ?, verified = ?
         WHERE id = ?"
    )
    .bind(clean(&payload.name).trim()) // XSS 清洗
    .bind(clean(&payload.description)) // XSS 清洗
    .bind(payload.ip.trim())
    .bind(payload.port)
    .bind(SqlxJson(&payload.versions)) // 绑定 versions 数组
    .bind(payload.max_players)
    .bind(payload.online_players)
    .bind(payload.icon.trim())
    .bind(payload.hero.trim())
    .bind(payload.website.trim())
    .bind(payload.server_type.trim())
    .bind(payload.language.trim())
    .bind(payload.modpack_url.trim())
    .bind(payload.has_paid_content)      // 【新增】读取该字段消除警告
    .bind(&payload.age_recommendation)   // 【新增】读取该字段消除警告
    .bind(SqlxJson(&payload.social_links))
    .bind(payload.has_voice_chat)
    .bind(payload.voice_platform.trim())
    .bind(payload.voice_url.trim())
    .bind(SqlxJson(&payload.features))
    .bind(SqlxJson(&payload.mechanics))
    .bind(SqlxJson(&payload.elements))
    .bind(SqlxJson(&payload.community))
    .bind(SqlxJson(&payload.tags))
    .bind(payload.verified) // 使用负载中的审核状态
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }

    Ok(StatusCode::OK)
}

// ================= 5. 快速切换审核状态 =================
pub async fn toggle_verify(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("UPDATE server_submissions SET verified = NOT verified WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }

    Ok(StatusCode::OK)
}

// ================= 6. 获取全站标签字典库 =================
pub async fn get_server_tags_dict(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<crate::models::ServerTagDict>>, (StatusCode, String)> {
    let dict = sqlx::query_as::<_, crate::models::ServerTagDict>(
        "SELECT * FROM server_tags_dict ORDER BY priority ASC, id ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(dict))
}
// ================= 7. 删除服务器记录 (补全上一次的需求) =================
pub async fn delete_server_submission(
    _claims: Claims, // 必须管理员权限
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM server_submissions WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }
    Ok(StatusCode::OK)
}

// ================= 8. 添加新标签字典 =================
pub async fn create_server_tag_dict(
    _claims: Claims, // 必须管理员权限
    State(pool): State<SqlitePool>,
    Json(payload): Json<ServerTagDictPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();

    // 注意：SVG 代码不能用 ammonia 清洗，否则 <svg> 标签会被直接抹除
    sqlx::query(
        "INSERT INTO server_tags_dict (id, category, label, icon_svg, color, priority) 
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(payload.category.trim())
    .bind(clean(&payload.label).trim()) // 文字部分依然进行防 XSS 清洗
    .bind(payload.icon_svg.trim())
    .bind(payload.color.trim())
    .bind(payload.priority)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::CREATED)
}

// ================= 9. 修改标签字典 =================
pub async fn update_server_tag_dict(
    _claims: Claims, // 必须管理员权限
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
    Json(payload): Json<ServerTagDictPayload>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        "UPDATE server_tags_dict 
         SET category = ?, label = ?, icon_svg = ?, color = ?, priority = ? 
         WHERE id = ?",
    )
    .bind(payload.category.trim())
    .bind(clean(&payload.label).trim()) // 文字防 XSS
    .bind(payload.icon_svg.trim())
    .bind(payload.color.trim())
    .bind(payload.priority)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Tag not found".to_string()));
    }
    Ok(StatusCode::OK)
}

// ================= 10. 删除标签字典 =================
pub async fn delete_server_tag_dict(
    _claims: Claims, // 必须管理员权限
    State(pool): State<SqlitePool>,
    AxumPath(id): AxumPath<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query("DELETE FROM server_tags_dict WHERE id = ?")
        .bind(&id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Tag not found".to_string()));
    }
    Ok(StatusCode::OK)
}

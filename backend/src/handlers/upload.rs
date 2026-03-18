// backend/src/handlers/upload.rs
use crate::models::Claims;
use axum::{Json, extract::Multipart, http::StatusCode};

// ==================== 文件上传模块 ====================

pub async fn upload_logo(
    _claims: Claims, // 确保只有登录的管理员可以上传文件
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 逐个字段读取 multipart 数据
    if let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let file_name = field.file_name().unwrap_or("upload.png").to_string();
        let path = format!("./uploads/{}", file_name);

        // 读取文件字节流
        let data = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // 写入本地磁盘
        tokio::fs::write(&path, data)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // 返回可访问的 URL 路径
        return Ok(Json(
            serde_json::json!({ "url": format!("/uploads/{}", file_name) }),
        ));
    }

    Err((StatusCode::BAD_REQUEST, "未检测到上传文件".to_string()))
}

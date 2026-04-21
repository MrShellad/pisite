use crate::handlers::image_storage::{
    convert_bytes_to_webp, uuid_file_name_with_original_extension, uuid_webp_file_name,
};
use crate::models::Claims;
use axum::{Json, extract::Multipart, http::StatusCode};

pub async fn upload_logo(
    _claims: Claims,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    else {
        return Err((StatusCode::BAD_REQUEST, "no file uploaded".to_string()));
    };

    let original_name = field.file_name().map(|value| value.to_string());
    let content_type = field.content_type().map(|value| value.to_ascii_lowercase());
    let data = field
        .bytes()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if data.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "empty file".to_string()));
    }

    let upload_dir = "./uploads/admin";
    tokio::fs::create_dir_all(upload_dir)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let is_image_upload = content_type
        .as_deref()
        .map(|value| value.starts_with("image/"))
        .unwrap_or(false)
        || image::guess_format(&data).is_ok();

    let (stored_bytes, file_name) = if is_image_upload {
        let encoded = convert_bytes_to_webp(&data).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
        (encoded, uuid_webp_file_name())
    } else {
        (
            data.to_vec(),
            uuid_file_name_with_original_extension(original_name.as_deref(), "bin"),
        )
    };

    let file_path = format!("{}/{}", upload_dir, file_name);
    tokio::fs::write(&file_path, stored_bytes)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        serde_json::json!({ "url": format!("/uploads/admin/{}", file_name) }),
    ))
}

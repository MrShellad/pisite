use image::{ImageEncoder, codecs::webp::WebPEncoder};
use std::path::Path;
use uuid::Uuid;

pub const MAX_UPLOAD_BODY_BYTES: usize = 50 * 1024 * 1024;

pub fn convert_bytes_to_webp(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let decoded =
        image::load_from_memory(bytes).map_err(|e| format!("failed to decode image: {}", e))?;
    let rgba = decoded.to_rgba8();
    let (width, height) = rgba.dimensions();

    let mut encoded = Vec::new();
    WebPEncoder::new_lossless(&mut encoded)
        .write_image(rgba.as_raw(), width, height, image::ColorType::Rgba8.into())
        .map_err(|e| format!("failed to encode webp: {}", e))?;

    Ok(encoded)
}

pub fn uuid_webp_file_name() -> String {
    format!("{}.webp", Uuid::new_v4())
}

pub fn uuid_file_name_with_original_extension(
    original_name: Option<&str>,
    default_ext: &str,
) -> String {
    let ext = original_name
        .and_then(|name| Path::new(name).extension().and_then(|value| value.to_str()))
        .and_then(sanitize_extension)
        .unwrap_or_else(|| sanitize_extension(default_ext).unwrap_or_else(|| "bin".to_string()));

    format!("{}.{}", Uuid::new_v4(), ext)
}

fn sanitize_extension(ext: &str) -> Option<String> {
    let clean = ext.trim().trim_start_matches('.').to_ascii_lowercase();

    if clean.is_empty() {
        return None;
    }

    if clean.chars().all(|ch| ch.is_ascii_alphanumeric()) {
        Some(clean)
    } else {
        None
    }
}

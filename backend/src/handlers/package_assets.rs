use crate::models::Claims;
use axum::{
    Json,
    extract::{Multipart, Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::{
    path::{Path as FsPath, PathBuf},
    time::UNIX_EPOCH,
};
use tokio::io::AsyncWriteExt;

const PACKAGE_URL_PREFIX: &str = "/api/package-assets/download";
const MAX_PACKAGE_BYTES: u64 = 1024 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageAsset {
    pub date: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub url: String,
    pub download_url: String,
    pub uploaded_at: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenamePackageAssetPayload {
    pub file_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemotePackageAssetPayload {
    pub url: String,
    #[serde(default)]
    pub file_name: Option<String>,
}

fn sanitize_file_name(raw: &str) -> String {
    let clean = raw
        .trim()
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("package.bin")
        .trim();

    let sanitized: String = clean
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '-'
            }
        })
        .collect();

    let sanitized = sanitized
        .trim_matches('.')
        .trim_matches('-')
        .chars()
        .take(180)
        .collect::<String>();

    if sanitized.is_empty() {
        "package.bin".to_string()
    } else {
        sanitized
    }
}

fn sanitize_date(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    let valid = trimmed.len() == 10
        && trimmed.chars().enumerate().all(|(index, ch)| {
            matches!(index, 4 | 7) && ch == '-' || !matches!(index, 4 | 7) && ch.is_ascii_digit()
        });

    if valid {
        Some(trimmed.to_string())
    } else {
        None
    }
}

fn package_root() -> PathBuf {
    std::env::var("UPLOADS_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("uploads"))
        .join("packages")
}

fn package_path(date: &str, file_name: &str) -> Result<PathBuf, (StatusCode, String)> {
    let date = sanitize_date(date)
        .ok_or((StatusCode::BAD_REQUEST, "Invalid package date.".to_string()))?;
    let file_name = sanitize_file_name(file_name);
    Ok(package_root().join(date).join(file_name))
}

async fn current_date(pool: &SqlitePool) -> Result<String, (StatusCode, String)> {
    let (date,): (String,) = sqlx::query_as("SELECT date('now')")
        .fetch_one(pool)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    Ok(date)
}

async fn site_domain(pool: &SqlitePool) -> Result<String, (StatusCode, String)> {
    let (domain,): (String,) =
        sqlx::query_as("SELECT COALESCE(site_domain, '') FROM site_settings WHERE id = '1'")
            .fetch_one(pool)
            .await
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    Ok(domain.trim().trim_end_matches('/').to_string())
}

fn build_download_url(domain: &str, relative_url: &str) -> String {
    if domain.is_empty() {
        relative_url.to_string()
    } else {
        format!("{}{}", domain.trim_end_matches('/'), relative_url)
    }
}

async fn package_asset_from_path(
    pool: &SqlitePool,
    date: &str,
    file_name: &str,
) -> Result<PackageAsset, (StatusCode, String)> {
    let path = package_path(date, file_name)?;
    let metadata = tokio::fs::metadata(&path).await.map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            "Package asset not found.".to_string(),
        )
    })?;
    let relative_url = format!(
        "{}/{}/{}",
        PACKAGE_URL_PREFIX,
        date,
        sanitize_file_name(file_name)
    );
    let domain = site_domain(pool).await?;
    let uploaded_at = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs() as i64);

    Ok(PackageAsset {
        date: date.to_string(),
        file_name: sanitize_file_name(file_name),
        size_bytes: metadata.len(),
        url: relative_url.clone(),
        download_url: build_download_url(&domain, &relative_url),
        uploaded_at,
    })
}

async fn unique_file_path(dir: &FsPath, file_name: &str) -> PathBuf {
    let candidate = dir.join(file_name);
    if tokio::fs::metadata(&candidate).await.is_err() {
        return candidate;
    }

    let path = FsPath::new(file_name);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("package");
    let ext = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("");

    for index in 1..1000 {
        let next_name = if ext.is_empty() {
            format!("{}-{}", stem, index)
        } else {
            format!("{}-{}.{}", stem, index, ext)
        };
        let next = dir.join(next_name);
        if tokio::fs::metadata(&next).await.is_err() {
            return next;
        }
    }

    dir.join(format!("{}-copy", file_name))
}

fn file_name_from_url(url: &reqwest::Url) -> String {
    url.path_segments()
        .and_then(|mut segments| segments.next_back())
        .map(sanitize_file_name)
        .filter(|value| value != "package.bin")
        .unwrap_or_else(|| "package.bin".to_string())
}

fn remote_download_client() -> Result<reqwest::Client, (StatusCode, String)> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
}

fn validate_remote_url(raw: &str) -> Result<reqwest::Url, (StatusCode, String)> {
    let url = reqwest::Url::parse(raw.trim())
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid remote URL.".to_string()))?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err((
            StatusCode::BAD_REQUEST,
            "Only HTTP and HTTPS package URLs are supported.".to_string(),
        ));
    }

    Ok(url)
}

pub async fn upload_package_asset(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    mut multipart: Multipart,
) -> Result<Json<PackageAsset>, (StatusCode, String)> {
    let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|error| (StatusCode::BAD_REQUEST, error.to_string()))?
    else {
        return Err((StatusCode::BAD_REQUEST, "No file uploaded.".to_string()));
    };

    let original_name = field
        .file_name()
        .map(sanitize_file_name)
        .unwrap_or_else(|| "package.bin".to_string());
    let date = current_date(&pool).await?;
    let dir = package_root().join(&date);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let target_path = unique_file_path(&dir, &original_name).await;
    let target_file_name = target_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(&original_name)
        .to_string();
    let mut file = tokio::fs::File::create(&target_path)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    let mut written = 0_u64;

    while let Some(chunk) = field
        .chunk()
        .await
        .map_err(|error| (StatusCode::BAD_REQUEST, error.to_string()))?
    {
        written += chunk.len() as u64;
        if written > MAX_PACKAGE_BYTES {
            let _ = tokio::fs::remove_file(&target_path).await;
            return Err((
                StatusCode::PAYLOAD_TOO_LARGE,
                "Package file must be 1GB or smaller.".to_string(),
            ));
        }
        file.write_all(&chunk)
            .await
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    }

    file.flush()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    if written == 0 {
        let _ = tokio::fs::remove_file(&target_path).await;
        return Err((StatusCode::BAD_REQUEST, "Empty file.".to_string()));
    }

    Ok(Json(
        package_asset_from_path(&pool, &date, &target_file_name).await?,
    ))
}

pub async fn download_remote_package_asset(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Json(payload): Json<RemotePackageAssetPayload>,
) -> Result<Json<PackageAsset>, (StatusCode, String)> {
    let url = validate_remote_url(&payload.url)?;
    let client = remote_download_client()?;
    let response = client
        .get(url.clone())
        .send()
        .await
        .map_err(|error| (StatusCode::BAD_GATEWAY, error.to_string()))?;

    if !response.status().is_success() {
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("Remote server returned HTTP {}.", response.status()),
        ));
    }

    if let Some(length) = response.content_length() {
        if length > MAX_PACKAGE_BYTES {
            return Err((
                StatusCode::PAYLOAD_TOO_LARGE,
                "Package file must be 1GB or smaller.".to_string(),
            ));
        }
    }

    let original_name = payload
        .file_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(sanitize_file_name)
        .unwrap_or_else(|| file_name_from_url(&url));
    let date = current_date(&pool).await?;
    let dir = package_root().join(&date);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let target_path = unique_file_path(&dir, &original_name).await;
    let target_file_name = target_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(&original_name)
        .to_string();
    let mut file = tokio::fs::File::create(&target_path)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    let mut written = 0_u64;
    let mut response = response;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| (StatusCode::BAD_GATEWAY, error.to_string()))?
    {
        written += chunk.len() as u64;
        if written > MAX_PACKAGE_BYTES {
            let _ = tokio::fs::remove_file(&target_path).await;
            return Err((
                StatusCode::PAYLOAD_TOO_LARGE,
                "Package file must be 1GB or smaller.".to_string(),
            ));
        }
        file.write_all(&chunk)
            .await
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    }

    file.flush()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    if written == 0 {
        let _ = tokio::fs::remove_file(&target_path).await;
        return Err((StatusCode::BAD_REQUEST, "Empty remote file.".to_string()));
    }

    Ok(Json(
        package_asset_from_path(&pool, &date, &target_file_name).await?,
    ))
}

pub async fn list_package_assets(
    _claims: Claims,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<PackageAsset>>, (StatusCode, String)> {
    let mut assets = Vec::new();
    let mut date_dirs = match tokio::fs::read_dir(package_root()).await {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Json(assets)),
        Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
    };

    while let Some(date_entry) = date_dirs
        .next_entry()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?
    {
        let file_type = date_entry
            .file_type()
            .await
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
        if !file_type.is_dir() {
            continue;
        }

        let date = date_entry.file_name().to_string_lossy().to_string();
        if sanitize_date(&date).is_none() {
            continue;
        }

        let mut files = tokio::fs::read_dir(date_entry.path())
            .await
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
        while let Some(file_entry) = files
            .next_entry()
            .await
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?
        {
            let file_type = file_entry
                .file_type()
                .await
                .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
            if !file_type.is_file() {
                continue;
            }
            let file_name = file_entry.file_name().to_string_lossy().to_string();
            if let Ok(asset) = package_asset_from_path(&pool, &date, &file_name).await {
                assets.push(asset);
            }
        }
    }

    assets.sort_by(|left, right| {
        right
            .date
            .cmp(&left.date)
            .then_with(|| right.uploaded_at.cmp(&left.uploaded_at))
            .then_with(|| left.file_name.cmp(&right.file_name))
    });

    Ok(Json(assets))
}

pub async fn rename_package_asset(
    _claims: Claims,
    State(pool): State<SqlitePool>,
    Path((date, file_name)): Path<(String, String)>,
    Json(payload): Json<RenamePackageAssetPayload>,
) -> Result<Json<PackageAsset>, (StatusCode, String)> {
    let source = package_path(&date, &file_name)?;
    let new_name = sanitize_file_name(&payload.file_name);
    let target = package_path(&date, &new_name)?;

    if tokio::fs::metadata(&source).await.is_err() {
        return Err((
            StatusCode::NOT_FOUND,
            "Package asset not found.".to_string(),
        ));
    }

    if source != target && tokio::fs::metadata(&target).await.is_ok() {
        return Err((
            StatusCode::CONFLICT,
            "A package with this file name already exists for the date.".to_string(),
        ));
    }

    tokio::fs::rename(&source, &target)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    Ok(Json(
        package_asset_from_path(&pool, &date, &new_name).await?,
    ))
}

pub async fn delete_package_asset(
    _claims: Claims,
    Path((date, file_name)): Path<(String, String)>,
) -> Result<StatusCode, (StatusCode, String)> {
    let path = package_path(&date, &file_name)?;
    tokio::fs::remove_file(&path).await.map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            (
                StatusCode::NOT_FOUND,
                "Package asset not found.".to_string(),
            )
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
        }
    })?;

    Ok(StatusCode::NO_CONTENT)
}

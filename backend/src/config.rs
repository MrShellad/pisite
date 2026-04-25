use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use std::{
    net::{AddrParseError, SocketAddr},
    path::PathBuf,
};

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub db_max_connections: u32,
    pub bind_host: String,
    pub bind_port: u16,
    pub uploads_dir: PathBuf,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite://flowcore.db?mode=rwc".to_string()),
            db_max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                .ok()
                .and_then(|value| value.parse::<u32>().ok())
                .unwrap_or(5),
            bind_host: std::env::var("BIND_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            bind_port: std::env::var("PORT")
                .ok()
                .and_then(|value| value.parse::<u16>().ok())
                .unwrap_or(3000),
            uploads_dir: PathBuf::from(
                std::env::var("UPLOADS_DIR").unwrap_or_else(|_| "uploads".to_string()),
            ),
        }
    }

    pub fn bind_addr(&self) -> Result<SocketAddr, AddrParseError> {
        format!("{}:{}", self.bind_host, self.bind_port).parse()
    }

    pub async fn connect_database(&self) -> Result<SqlitePool, sqlx::Error> {
        SqlitePoolOptions::new()
            .max_connections(self.db_max_connections)
            .connect(&self.database_url)
            .await
    }
}

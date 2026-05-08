use axum::{
    Router,
    http::{Method, header},
    middleware,
};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

mod api_catalog;
mod auth;
mod config;
mod donor_support;
mod handlers;
mod init;
mod models;
mod routes;

use config::AppConfig;

fn build_cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT])
}

#[tokio::main]
async fn main() {
    let config = AppConfig::from_env();
    let pool = config
        .connect_database()
        .await
        .expect("failed to connect to database");

    println!("database connected");

    init::db::initialize_database(&pool).await;
    init::daemons::spawn_background_tasks(&pool);

    tokio::fs::create_dir_all(&config.uploads_dir)
        .await
        .expect("failed to create uploads directory");
    let package_downloads_dir = config.uploads_dir.join("packages");

    let mut app = Router::new()
        .merge(routes::create_router(pool.clone()))
        .nest_service(
            "/api/package-assets/download",
            ServeDir::new(package_downloads_dir),
        )
        .nest_service(
            "/uploads/admin",
            ServeDir::new(config.uploads_dir.join("admin")),
        )
        .nest_service(
            "/uploads/mc_covers",
            ServeDir::new(config.uploads_dir.join("mc_covers")),
        )
        .nest_service(
            "/uploads/server_covers",
            ServeDir::new(config.uploads_dir.join("server_covers")),
        )
        .layer(middleware::from_fn(crate::auth::admin_auth_middleware))
        .layer(middleware::from_fn_with_state(
            pool.clone(),
            crate::handlers::api_key_middleware::api_key_middleware,
        ))
        .layer(build_cors_layer());

    if config.admin_internal_only {
        app = app.layer(middleware::from_fn(
            crate::handlers::admin_internal_middleware::admin_internal_only_middleware,
        ));
    }

    let addr = config.bind_addr().expect("invalid BIND_HOST/PORT");
    println!("backend listening on http://{addr}");

    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind tcp listener");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .expect("backend server crashed");
}

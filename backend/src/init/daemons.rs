use sqlx::SqlitePool;

pub fn spawn_background_tasks(pool: &SqlitePool) {
    let crawler_pool = pool.clone();
    tokio::spawn(async move {
        crate::handlers::minecraft_api::crawler_daemon(crawler_pool).await;
    });

    let manifest_pool = pool.clone();
    tokio::spawn(async move {
        crate::handlers::minecraft_api::version_manifest_daemon(manifest_pool).await;
    });

    let server_ping_pool = pool.clone();
    tokio::spawn(async move {
        crate::handlers::server_submissions::server_status_daemon(server_ping_pool).await;
    });
}

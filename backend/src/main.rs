// backend/src/main.rs
use std::net::SocketAddr;
use tokio::net::TcpListener;
use sqlx::sqlite::SqlitePoolOptions;
use tower_http::services::ServeDir;
use tower_http::cors::{CorsLayer, Any};
use axum::http::{Method, header};
mod models;
mod handlers;
mod routes;
mod auth;

#[tokio::main]
async fn main() {
    let db_url = "sqlite://flowcore.db?mode=rwc";
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(db_url)
        .await
        .expect("无法连接到数据库");

    println!("数据库连接成功！");

    // 1. 自动建表：sponsors
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sponsors (
            id TEXT PRIMARY KEY,
            icon TEXT NOT NULL,
            name TEXT NOT NULL,
            desc TEXT NOT NULL,
            tags TEXT NOT NULL,
            price TEXT NOT NULL,
            link TEXT NOT NULL,
            regions TEXT NOT NULL,
            priority INTEGER NOT NULL,
            border_color TEXT NOT NULL,
            background_color TEXT NOT NULL,
            text_color TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1
        );"
    ).execute(&pool).await.expect("创建 sponsors 表失败");

    // 2. 自动建表：users
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );"
    ).execute(&pool).await.expect("创建 users 表失败");

    // 3. 自动建表：features
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS features (
            id TEXT PRIMARY KEY,
            icon_svg TEXT NOT NULL,
            icon_color TEXT NOT NULL,
            title TEXT NOT NULL,
            desc TEXT NOT NULL,
            priority INTEGER NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1
        );"
    ).execute(&pool).await.expect("创建 features 表失败");


// 自动建表：Tauri 发行版与更新日志 (替代原来的 changelogs)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_releases (
            id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            display_version TEXT NOT NULL,
            date TEXT NOT NULL,
            channel TEXT NOT NULL,
            rollout_type TEXT NOT NULL,
            rollout_value TEXT NOT NULL,
            allowed_regions TEXT NOT NULL,
            status TEXT NOT NULL,
            platforms_json TEXT NOT NULL,
            changes_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    ).execute(&pool).await.expect("创建 app_releases 表失败");

    // 5. 自动建表：faqs
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS faqs (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            icon_svg TEXT NOT NULL,
            icon_color TEXT NOT NULL,
            priority INTEGER NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1
        );"
    ).execute(&pool).await.expect("创建 faqs 表失败");

    // 6. 自动建表：hero_config (已统一使用 logo_url)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS hero_config (
            id TEXT PRIMARY KEY,
            logo_url TEXT NOT NULL,
            logo_color TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT NOT NULL,
            description TEXT NOT NULL,
            button_text TEXT NOT NULL,
            update_date TEXT NOT NULL,
            dl_mac TEXT NOT NULL,
            dl_win TEXT NOT NULL,
            dl_linux TEXT NOT NULL
        );"
    ).execute(&pool).await.expect("创建 hero_config 表失败");

    // 初始化默认 Hero 数据
    let hero_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hero_config").fetch_one(&pool).await.unwrap_or((0,));
    if hero_count.0 == 0 {
        sqlx::query("INSERT INTO hero_config (id, logo_url, logo_color, title, subtitle, description, button_text, update_date, dl_mac, dl_win, dl_linux) VALUES ('1', '', '#3b82f6', '连接、自动化', '赋能您的工作流', 'FlowCore 是一款专为开发者与团队打造的高效工具。', '立即下载 FlowCore Pro', '2026-03-04', '#', '#', '#')")
            .execute(&pool).await.unwrap();
    }

    // 7. 自动建表：site_settings
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS site_settings (
            id TEXT PRIMARY KEY,
            site_name TEXT NOT NULL,
            seo_title TEXT NOT NULL,
            seo_description TEXT NOT NULL,
            seo_keywords TEXT NOT NULL,
            github_url TEXT NOT NULL,
            twitter_url TEXT NOT NULL,
            discord_url TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            copyright TEXT NOT NULL
        );"
    ).execute(&pool).await.expect("创建 site_settings 表失败");

    // 初始化默认设置
    let settings_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM site_settings").fetch_one(&pool).await.unwrap_or((0,));
    if settings_count.0 == 0 {
        sqlx::query("INSERT INTO site_settings (id, site_name, seo_title, seo_description, seo_keywords, github_url, twitter_url, discord_url, contact_email, copyright) VALUES ('1', 'FlowCore', 'FlowCore - 极速跨平台工具', '专为开发者与团队打造的高效工具。', 'Rust,工具,跨平台', 'https://github.com', '', '', 'admin@flowcore.app', '2026 FlowCore Inc. 保留所有权利。')")
            .execute(&pool).await.unwrap();
    }

    // 8. 数据统计表
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS downloads_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint TEXT NOT NULL,
            ip TEXT NOT NULL,
            platform TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    ).execute(&pool).await.expect("创建 downloads_log 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_activations (
            device_uuid TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            ip TEXT NOT NULL,
            os_version TEXT,
            activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    ).execute(&pool).await.expect("创建 app_activations 表失败");


    // ==============================================
    // 自动建表：Minecraft 爬虫缓存表 (mc_updates)
    // ==============================================
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mc_updates (
            version TEXT PRIMARY KEY,
            v_type TEXT NOT NULL,
            title TEXT NOT NULL,
            cover TEXT NOT NULL,
            article TEXT NOT NULL,
            wiki_en TEXT NOT NULL,
            wiki_zh TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    ).execute(&pool).await.expect("创建 mc_updates 表失败");

    // ==============================================
    // 自动建表：爬虫配置与统计表 (mc_crawler_config)
    // ==============================================
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mc_crawler_config (
            id TEXT PRIMARY KEY,
            interval_minutes INTEGER NOT NULL,
            request_count INTEGER NOT NULL DEFAULT 0,
            last_crawl_time DATETIME,
            last_crawl_status TEXT
        );"
    ).execute(&pool).await.expect("创建 mc_crawler_config 表失败");

    // 初始化默认爬虫配置 (默认 60 分钟抓取一次)
    let config_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM mc_crawler_config").fetch_one(&pool).await.unwrap_or((0,));
    if config_count.0 == 0 {
        sqlx::query("INSERT INTO mc_crawler_config (id, interval_minutes, request_count, last_crawl_status) VALUES ('1', 60, 0, '等待首次抓取...')")
            .execute(&pool).await.unwrap();
    }

    // ==============================================
    // 🚀 启动后台爬虫守护进程 (Daemon Task)
    // ==============================================
    let crawler_pool = pool.clone();
    tokio::spawn(async move {
        crate::handlers::minecraft_api::crawler_daemon(crawler_pool).await;
    });


    

    // 9. 目录与服务启动
    tokio::fs::create_dir_all("./uploads").await.unwrap();

    // 【新增】配置 CORS 通行证
    let cors = CorsLayer::new()
        // 允许所有源（开发环境极其方便），如果想安全点可以写具体的 allow_origin
        .allow_origin(Any)
        // 允许前端使用的方法
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        // 允许前端携带的 Header（特别是 JWT 登录用的 AUTHORIZATION 和发 JSON 用的 CONTENT_TYPE）
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT]);

    // 挂载路由、静态服务，最后套上 CORS 层
    let app = routes::create_router(pool)
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(cors); // 【关键】给整个后端服务穿上 CORS 防护服

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("后端服务器已启动，监听在 http://{}", addr);
    
    let listener = TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
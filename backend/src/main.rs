// backend/src/main.rs
use axum::{http::{Method, header}, middleware, Router};
use sqlx::sqlite::SqlitePoolOptions;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
mod auth;
mod handlers;
mod models;
mod routes;
mod api_catalog;

async fn migrate_admin_users_table(pool: &sqlx::SqlitePool) {
    // 旧版本使用 users(id,email,password_hash) 作为管理员表。
    // 新版本需要把 users 留给捐赠玩家系统，所以这里做一次性迁移：users -> admin_users。
    // 迁移策略：如果 admin_users 不存在且 users 存在，并且 users 不含 mc_uuid 列，则重命名。
    let admin_exists: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    if admin_exists.is_some() {
        return;
    }

    let users_exists: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    if users_exists.is_none() {
        return;
    }

    // 检查 users 表是否已经是捐赠玩家表（含 mc_uuid）
    let cols: Vec<(i64, String, String, i64, Option<String>, i64)> =
        sqlx::query_as("PRAGMA table_info(users)")
            .fetch_all(pool)
            .await
            .unwrap_or_default();

    let has_mc_uuid = cols.iter().any(|c| c.1 == "mc_uuid");
    if has_mc_uuid {
        return;
    }

    // 将旧 users 视为管理员表，重命名为 admin_users
    let _ = sqlx::query("ALTER TABLE users RENAME TO admin_users")
        .execute(pool)
        .await;
}

#[tokio::main]
async fn main() {
    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://flowcore.db?mode=rwc".to_string());
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("无法连接到数据库");

    println!("数据库连接成功！");

    migrate_admin_users_table(&pool).await;

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 sponsors 表失败");

    // 2. 自动建表：admin_users (后台管理员)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS admin_users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 users 表失败");

    // 2.1 自动建表：捐赠玩家系统 users / donations / licenses / devices / activations
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            mc_uuid TEXT UNIQUE NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 donor users 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS donations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            donated_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 donations 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            tier TEXT NOT NULL,
            is_beta_enabled BOOLEAN NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 licenses 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_uuid TEXT NOT NULL,
            device_name TEXT NOT NULL,
            last_seen_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            UNIQUE(user_id, device_uuid),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 devices 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS activations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            issued_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            last_refresh_at DATETIME,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 activations 表失败");

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 features 表失败");

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 app_releases 表失败");

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 faqs 表失败");

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 hero_config 表失败");

    // 初始化默认 Hero 数据
    let hero_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hero_config")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));
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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 site_settings 表失败");

    // 初始化默认设置
    let settings_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM site_settings")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));
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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 downloads_log 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_activations (
            device_uuid TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            ip TEXT NOT NULL,
            os_version TEXT,
            activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 app_activations 表失败");

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 mc_updates 表失败");

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
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 mc_crawler_config 表失败");

    // 初始化默认爬虫配置 (默认 60 分钟抓取一次)
    let config_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM mc_crawler_config")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));
    if config_count.0 == 0 {
        sqlx::query("INSERT INTO mc_crawler_config (id, interval_minutes, request_count, last_crawl_status) VALUES ('1', 60, 0, '等待首次抓取...')")
            .execute(&pool).await.unwrap();
    }

    // ==============================================
    // 自动建表：服务器广场/发现页
    // ==============================================
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS server_submissions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER NOT NULL,
            versions TEXT NOT NULL DEFAULT '[]',
            max_players INTEGER NOT NULL,
            online_players INTEGER NOT NULL,
            icon TEXT NOT NULL,
            hero TEXT NOT NULL,
            website TEXT NOT NULL,
            server_type TEXT NOT NULL,
            language TEXT NOT NULL,
            modpack_url TEXT NOT NULL DEFAULT '',
            has_paid_content BOOLEAN NOT NULL DEFAULT 0,       
            age_recommendation TEXT NOT NULL DEFAULT '全年龄',
            social_links TEXT NOT NULL DEFAULT '[]',
            has_voice_chat BOOLEAN NOT NULL DEFAULT 0,
            voice_platform TEXT NOT NULL DEFAULT '',
            voice_url TEXT NOT NULL DEFAULT '',
            features TEXT NOT NULL DEFAULT '[]',
            mechanics TEXT NOT NULL DEFAULT '[]',
            elements TEXT NOT NULL DEFAULT '[]',
            community TEXT NOT NULL DEFAULT '[]',
            tags TEXT NOT NULL DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            verified BOOLEAN NOT NULL DEFAULT 0
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 servers 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS server_tags_dict (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            label TEXT NOT NULL,
            icon_svg TEXT NOT NULL,
            color TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 server_tags_dict 表失败");

    // 初始化一些种子数据供前端使用
    let dict_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM server_tags_dict")
        .fetch_one(&pool)
        .await
        .unwrap_or((0,));
    if dict_count.0 == 0 {
        let seed_data = [
            (
                "1",
                "features",
                "纯净原版",
                r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>"#,
                "#10b981",
            ),
            (
                "2",
                "mechanics",
                "PVP 战斗",
                r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>"#,
                "#f97316",
            ),
            (
                "3",
                "elements",
                "魔法技能",
                r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>"#,
                "#8b5cf6",
            ),
            (
                "4",
                "community",
                "内置语音",
                r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>"#,
                "#0ea5e9",
            ),
        ];
        for (id, cat, label, svg, color) in seed_data {
            sqlx::query("INSERT INTO server_tags_dict (id, category, label, icon_svg, color, priority) VALUES (?, ?, ?, ?, ?, 0)")
                .bind(id).bind(cat).bind(label).bind(svg).bind(color)
                .execute(&pool).await.unwrap();
        }
    }

    // 10. API Key 管理与访问日志
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key TEXT NOT NULL UNIQUE,
            scopes TEXT,
            rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_used_at DATETIME
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 api_keys 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key_id TEXT,
            path TEXT NOT NULL,
            method TEXT NOT NULL,
            status INTEGER NOT NULL,
            ip TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 api_access_logs 表失败");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS api_endpoint_policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method TEXT NOT NULL,
            path_template TEXT NOT NULL,
            group_name TEXT NOT NULL,
            public_enabled BOOLEAN NOT NULL DEFAULT 1,
            require_api_key BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(method, path_template)
        );",
    )
    .execute(&pool)
    .await
    .expect("创建 api_endpoint_policies 表失败");

    // 将全部 API 路由注册进列表（只插入不存在的，默认允许公网访问）
    for item in crate::api_catalog::API_CATALOG {
        let _ = sqlx::query(
            "INSERT OR IGNORE INTO api_endpoint_policies (method, path_template, group_name, public_enabled, require_api_key)
             VALUES (?, ?, ?, 1, 0)",
        )
        .bind(item.method)
        .bind(item.path)
        .bind(item.group)
        .execute(&pool)
        .await;
    }

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
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        // 允许前端携带的 Header（特别是 JWT 登录用的 AUTHORIZATION 和发 JSON 用的 CONTENT_TYPE）
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT]);

    // 挂载路由、静态服务，套上 API Key 中间件 + CORS
    let app_router = routes::create_router(pool.clone());

    let app = Router::new()
        .merge(app_router)
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(middleware::from_fn_with_state(
            pool.clone(),
            crate::handlers::api_key_middleware::api_key_middleware,
        ))
        .layer(cors); // 【关键】给整个后端服务穿上 CORS 防护服

    let host = std::env::var("BIND_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(3000);
    let addr: SocketAddr = format!("{}:{}", host, port).parse().expect("BIND_HOST/PORT 无效");
    println!("后端服务器已启动，监听在 http://{}", addr);

    let listener = TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

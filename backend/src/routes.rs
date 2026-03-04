// backend/src/routes.rs
use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::SqlitePool;

// 引入刚刚彻底解耦的 handlers 模块
use crate::handlers;

pub fn create_router(pool: SqlitePool) -> Router {
    Router::new()
        // ==========================================
        // 公开前台接口 (Public API)
        // ==========================================
        
        // 1. 身份验证与系统初始化
        .route("/api/auth/check-init", get(handlers::auth::check_init))
        .route("/api/auth/init", post(handlers::auth::init_admin))
        .route("/api/auth/login", post(handlers::auth::login))

        // 2. 全局设置与首屏
        .route("/api/settings", get(handlers::settings::get_settings))
        .route("/api/hero", get(handlers::hero::get_hero))

        // 3. 核心业务数据 (只返回已启用的前台展示数据)
        .route("/api/features", get(handlers::features::get_features))
        .route("/api/faqs", get(handlers::faqs::get_faqs))
        .route("/api/sponsors", get(handlers::sponsors::get_sponsors))
        
        // 4. 更新日志与杂项友链
        .route("/api/changelog", get(handlers::changelog::get_changelog))
        .route("/api/friends", get(handlers::misc::get_friends))

        // 5. Minecraft 爬虫 API
        .route("/api/mc/latest-update", get(handlers::minecraft_api::get_latest_update))

        // 6. 数据追踪与端点打点
        .route("/api/track/download", post(handlers::stats::track_download))
        .route("/api/track/activate", post(handlers::stats::activate_app))
        .route("/api/updater", get(handlers::changelog::tauri_updater))

        // ==========================================
        // 后台管理接口 (Admin API)
        // ==========================================

        // 1. 仪表盘统计
        .route("/api/admin/dashboard", get(handlers::stats::get_dashboard_stats))

        // 2. 全局设置与首屏管理
        .route("/api/admin/settings", put(handlers::settings::update_settings))
        .route("/api/admin/hero", put(handlers::hero::update_hero))

        // 3. 核心特性管理 (注意这里的 {id} 语法)
        .route("/api/admin/features/all", get(handlers::features::get_all_features))
        .route("/api/admin/features", post(handlers::features::add_feature))
        .route("/api/admin/features/{id}/toggle", put(handlers::features::toggle_feature))
        .route("/api/admin/features/{id}", delete(handlers::features::delete_feature))

        // 4. 常见问题 (FAQ) 管理
        .route("/api/admin/faqs/all", get(handlers::faqs::get_all_faqs))
        .route("/api/admin/faqs", post(handlers::faqs::add_faq))
        .route("/api/admin/faqs/{id}/toggle", put(handlers::faqs::toggle_faq))
        .route("/api/admin/faqs/{id}", delete(handlers::faqs::delete_faq))

        // 5. 赞助商网络配置
        .route("/api/admin/sponsors/all", get(handlers::sponsors::get_all_sponsors))
        .route("/api/admin/sponsors", post(handlers::sponsors::add_sponsor))
        .route("/api/admin/sponsors/{id}/toggle", put(handlers::sponsors::toggle_sponsor))
        .route("/api/admin/sponsors/{id}", delete(handlers::sponsors::delete_sponsor))

        // 6. 更新日志发布
        .route(
            "/api/admin/changelog", 
            get(handlers::changelog::get_admin_changelogs)
            .post(handlers::changelog::add_changelog)
        )
        .route("/api/admin/changelog/{id}/rollback", post(handlers::changelog::rollback_changelog))
        .route("/api/admin/changelog/{id}", delete(handlers::changelog::delete_changelog))

        // 7. 图片/文件上传中心
        .route("/api/admin/upload", post(handlers::upload::upload_logo))

        .route("/api/admin/mc-crawler/config", get(handlers::minecraft_api::get_crawler_config))
        .route("/api/admin/mc-crawler/config", put(handlers::minecraft_api::update_crawler_config))
        .route("/api/admin/mc-crawler/cached", get(handlers::minecraft_api::get_cached_updates))
        .route("/api/admin/mc-crawler/force", post(handlers::minecraft_api::force_crawl))

        

        // 将 SQLite 数据库连接池注入到整个路由树中
        .with_state(pool)
}
// backend/src/routes.rs
use axum::{
    Router,
    routing::{delete, get, post, put},
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
        .route(
            "/api/mc/latest-update",
            get(handlers::minecraft_api::get_latest_update),
        )
        .route(
            "/api/server-submissions",
            post(handlers::server_submissions::create_server_submission).get(handlers::server_submissions::get_public_server_submissions),
        )
        .route(
            "/api/server-submissions/upload-cover",
            post(handlers::server_submissions::upload_server_cover),
        )
        // 6. 数据追踪与端点打点
        .route("/api/track/download", post(handlers::stats::track_download))
        .route("/api/track/activate", post(handlers::stats::activate_app))
        .route("/api/updater", get(handlers::changelog::tauri_updater))
        // 7. 捐赠玩家授权系统 (Public)
        .route("/api/donors/login", post(handlers::donor_client::login))
        .route("/api/donors/refresh", post(handlers::donor_client::refresh))
        .route("/api/donors/me", get(handlers::donor_client::me))
        // 8. 信令服务器列表 (Public / Client API)
        .route("/api/signaling-servers", get(handlers::signaling::get_public_signaling_servers))
        // ==========================================
        // 后台管理接口 (Admin API)
        // ==========================================
        // 1. 仪表盘统计
        .route(
            "/api/admin/dashboard",
            get(handlers::stats::get_dashboard_stats),
        )
        // 2. 全局设置与首屏管理
        .route(
            "/api/admin/settings",
            put(handlers::settings::update_settings),
        )
        .route("/api/admin/hero", put(handlers::hero::update_hero))
        // 3. 核心特性管理 (注意这里的 {id} 语法)
        .route(
            "/api/admin/features/all",
            get(handlers::features::get_all_features),
        )
        .route("/api/admin/features", post(handlers::features::add_feature))
        .route(
            "/api/admin/features/{id}/toggle",
            put(handlers::features::toggle_feature),
        )
        .route(
            "/api/admin/features/{id}",
            delete(handlers::features::delete_feature),
        )
        // 4. 常见问题 (FAQ) 管理
        .route("/api/admin/faqs/all", get(handlers::faqs::get_all_faqs))
        .route("/api/admin/faqs", post(handlers::faqs::add_faq))
        .route(
            "/api/admin/faqs/{id}/toggle",
            put(handlers::faqs::toggle_faq),
        )
        .route("/api/admin/faqs/{id}", delete(handlers::faqs::delete_faq))
        // 5. 赞助商网络配置
        .route(
            "/api/admin/sponsors/all",
            get(handlers::sponsors::get_all_sponsors),
        )
        .route("/api/admin/sponsors", post(handlers::sponsors::add_sponsor))
        .route(
            "/api/admin/sponsors/{id}/toggle",
            put(handlers::sponsors::toggle_sponsor),
        )
        .route(
            "/api/admin/sponsors/{id}",
            delete(handlers::sponsors::delete_sponsor),
        )
        // 6. 更新日志发布
        .route(
            "/api/admin/changelog",
            get(handlers::changelog::get_admin_changelogs).post(handlers::changelog::add_changelog),
        )
        .route(
            "/api/admin/changelog/{id}/rollback",
            post(handlers::changelog::rollback_changelog),
        )
        .route(
            "/api/admin/changelog/{id}",
            delete(handlers::changelog::delete_changelog),
        )
        // 7. 图片/文件上传中心
        .route("/api/admin/upload", post(handlers::upload::upload_logo))
        .route(
            "/api/admin/mc-crawler/config",
            get(handlers::minecraft_api::get_crawler_config),
        )
        .route(
            "/api/admin/mc-crawler/config",
            put(handlers::minecraft_api::update_crawler_config),
        )
        .route(
            "/api/admin/mc-crawler/cached",
            get(handlers::minecraft_api::get_cached_updates),
        )
        .route(
            "/api/admin/mc-crawler/force",
            post(handlers::minecraft_api::force_crawl),
        )
        .route(
            "/api/admin/server-submissions",
            get(handlers::server_submissions::get_all_server_submissions),
        )
        .route(
            "/api/admin/server-submissions/{id}",
            put(handlers::server_submissions::update_server_submission),
        )
        // 【新增 1】补全上一个需求中的删除服务器路由
        .route(
            "/api/admin/server-submissions/{id}",
            delete(handlers::server_submissions::delete_server_submission),
        )
        .route(
            "/api/admin/server-submissions/{id}/toggle-verify",
            put(handlers::server_submissions::toggle_verify),
        )
        // 公开的获取标签字典路由 (原先已存在)
        .route(
            "/api/server-tags-dict",
            get(handlers::server_submissions::get_server_tags_dict),
        )
        // 【新增 2】标签字典的管理员操作路由 (增、改、删)
        .route(
            "/api/admin/server-tags-dict",
            post(handlers::server_submissions::create_server_tag_dict),
        )
        .route(
            "/api/admin/server-tags-dict/{id}",
            put(handlers::server_submissions::update_server_tag_dict),
        )
        .route(
            "/api/admin/server-tags-dict/{id}",
            delete(handlers::server_submissions::delete_server_tag_dict),
        )
        // 8. 捐赠玩家授权系统 (Admin)
        .route(
            "/api/admin/donor-users",
            get(handlers::donor_admin::list_users).post(handlers::donor_admin::create_user),
        )
        .route(
            "/api/admin/donor-users/{id}",
            put(handlers::donor_admin::update_user).delete(handlers::donor_admin::delete_user),
        )
        .route(
            "/api/admin/donor-users/{user_id}/license",
            get(handlers::donor_admin::get_license).put(handlers::donor_admin::upsert_license),
        )
        .route(
            "/api/admin/donor-users/{user_id}/donations",
            get(handlers::donor_admin::list_donations),
        )
        .route(
            "/api/admin/donor-donations",
            post(handlers::donor_admin::add_donation),
        )
        .route(
            "/api/admin/donor-users/{user_id}/devices",
            get(handlers::donor_admin::list_devices),
        )
        .route(
            "/api/admin/donor-devices/{id}/toggle",
            put(handlers::donor_admin::toggle_device_active),
        )
        .route(
            "/api/admin/donor-users/{user_id}/activations",
            get(handlers::donor_admin::list_activations),
        )
        // 9. API Key 管理与访问日志
        .route(
            "/api/admin/api-keys",
            get(handlers::api_keys::list_api_keys).post(handlers::api_keys::create_api_key),
        )
        .route(
            "/api/admin/api-keys/{id}",
            put(handlers::api_keys::update_api_key).delete(handlers::api_keys::delete_api_key),
        )
        .route(
            "/api/admin/api-logs",
            get(handlers::api_keys::list_logs),
        )
        // 管理员账号（修改邮箱/密码）
        .route(
            "/api/admin/profile",
            get(handlers::admin_profile::get_profile).put(handlers::admin_profile::update_profile),
        )
        // 10. API 公网访问控制（策略表）
        .route(
            "/api/admin/api-endpoints",
            get(handlers::api_endpoint_policies::list_policies),
        )
        .route(
            "/api/admin/api-endpoints/{id}",
            put(handlers::api_endpoint_policies::update_policy),
        )
        // 11. 信令服务器管理
        .route(
            "/api/admin/signaling-servers",
            get(handlers::signaling::list_signaling_servers).post(handlers::signaling::add_signaling_server),
        )
        .route(
            "/api/admin/signaling-servers/{id}",
            put(handlers::signaling::update_signaling_server).delete(handlers::signaling::delete_signaling_server),
        )
        .route(
            "/api/admin/signaling-servers/{id}/toggle",
            put(handlers::signaling::toggle_signaling_server),
        )
        // 将 SQLite 数据库连接池注入到整个路由树中
        .with_state(pool)
}

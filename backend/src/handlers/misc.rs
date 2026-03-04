// backend/src/handlers/misc.rs
use axum::Json;
use crate::models::FriendLink;

// ==================== 杂项与友链模块 ====================

// 获取友情链接 (前台公开)
pub async fn get_friends() -> Json<Vec<FriendLink>> {
    // 目前是硬编码，未来如果你想把友链也做成后台可配置的，
    // 只需要在这里引入 State(pool): State<SqlitePool> 然后查库即可。
    let friends = vec![
        FriendLink { name: "Rust 语言中文社区".to_string(), href: "#".to_string() },
        FriendLink { name: "Tauri 跨平台框架".to_string(), href: "#".to_string() },
        FriendLink { name: "Vite 极速构建".to_string(), href: "#".to_string() },
        FriendLink { name: "PowerNode 极客博客".to_string(), href: "#".to_string() },
    ];
    Json(friends)
}
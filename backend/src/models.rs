// backend/src/models.rs
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::types::Json; // 【新增】用于处理 SQLite 中的 JSON 数组

// 使用 pub 关键字让其他模块可以访问这个结构体及其字段
#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")] // 让 Rust 的下划线自动转成前端需要的驼峰命名 (border_color -> borderColor)
pub struct Sponsor {
    pub id: String,
    pub icon: String,
    pub name: String,
    pub desc: String,
    pub tags: Json<Vec<String>>, // 数组以 JSON 存入
    pub price: String,
    pub link: String,
    pub regions: Json<Vec<String>>, // 数组以 JSON 存入
    pub priority: i32,
    pub border_color: String,
    pub background_color: String,
    pub text_color: String,
    pub enabled: bool, // 独立禁用开关 (SQLite 中为 0/1)
}

#[derive(Serialize, Clone)]
pub struct FriendLink {
    pub name: String,
    pub href: String,
}

// 1. JWT 中包含的载荷 (Payload) 结构
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // subject (通常是用户名或用户ID)
    pub exp: usize,  // expiration (过期时间的时间戳)
}

// 2. 前端发送的登录请求体
#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String, // 【新增】
    pub password: String,
}

// 3. 返回给前端的登录结果
#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminProfileResponse {
    pub email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAdminProfilePayload {
    pub currentPassword: String,
    pub newEmail: String,
    pub newPassword: String,
}

// 【新增】第一次初始化的请求体
#[derive(Deserialize)]
pub struct InitPayload {
    pub email: String,
    pub password: String,
}

// 【新增】数据库中的用户映射模型
#[derive(FromRow)]
pub struct AdminUser {
    pub id: String,
    pub email: String,
    pub password_hash: String,
}

// ==================== 捐赠用户授权系统模型 ====================

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DonorUser {
    pub id: String,
    pub mc_uuid: String,
    pub email: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Donation {
    pub id: String,
    pub user_id: String,
    pub amount: f64,
    pub currency: String,
    pub donated_at: String,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct License {
    pub id: String,
    pub user_id: String,
    pub tier: String,          // supporter / vip
    pub is_beta_enabled: bool, // 是否推送体验版
    pub status: String,        // active / expired / banned
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub id: String,
    pub user_id: String,
    pub device_uuid: String,
    pub device_name: String,
    pub last_seen_at: Option<String>,
    pub created_at: Option<String>,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Activation {
    pub id: String,
    pub user_id: String,
    pub device_id: String,
    pub issued_at: String,
    pub expires_at: String,
    pub last_refresh_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorUpsertUserPayload {
    pub mc_uuid: String,
    pub email: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorUpsertLicensePayload {
    pub tier: String,
    pub is_beta_enabled: bool,
    pub status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorAddDonationPayload {
    pub user_id: String,
    pub amount: f64,
    pub currency: String,
    pub donated_at: String, // ISO / YYYY-MM-DD...
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorClientLoginPayload {
    pub mc_uuid: String,
    pub device_uuid: String,
    pub device_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorClientAuthResponse {
    pub token: String,
    pub expires_at: String,
    pub tier: String,
    pub is_beta_enabled: bool,
    pub status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorClientMeResponse {
    pub expires_at: String,
    pub tier: String,
    pub is_beta_enabled: bool,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Feature {
    pub id: String,
    pub icon_svg: String, // 直接存储 SVG 代码字符串
    pub icon_color: String,
    pub title: String,
    pub desc: String, // 次要文字
    pub priority: i32,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChangeItem {
    pub icon_svg: String,
    pub icon_color: String,
    pub text: String,
}

// 供前端返回的最终结构
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangelogEntry {
    pub id: String,
    pub version: String,
    pub date: String,
    pub is_latest: bool, // 后端动态计算，不需要存数据库
    pub changes: Vec<ChangeItem>,
}

// 【新增】FAQ 模型
#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Faq {
    pub id: String,
    pub question: String,
    pub answer: String,
    pub icon_svg: String,
    pub icon_color: String,
    pub priority: i32,
    pub enabled: bool,
}

// backend/src/models.rs
#[derive(Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")] // 这行会让 logo_url 自动匹配前端的 logoUrl
pub struct HeroConfig {
    pub id: String,
    pub logo_url: String, // 【修改】从 logo_svg 改为 logo_url
    pub logo_color: String,
    pub title: String,
    pub subtitle: String,
    pub description: String,
    pub button_text: String,
    pub update_date: String,
    pub dl_mac: String,
    pub dl_win: String,
    pub dl_linux: String,
}

// 1. 接收网页下载打点的请求体
#[derive(Deserialize)]
pub struct DownloadTrackPayload {
    pub platform: String,    // "macOS", "Windows", "Linux"
    pub fingerprint: String, // 浏览器指纹 (前端生成的持久化 UUID)
}

// 2. 接收客户端 App 激活的请求体
#[derive(Deserialize)]
pub struct ActivationPayload {
    pub platform: String,           // "macOS", "Windows", "Linux"
    pub os_version: Option<String>, // 系统具体版本 (选填)
}

// 3. 返回给客户端 App 的激活响应
#[derive(Serialize)]
pub struct ActivationResponse {
    pub device_uuid: String, // 给这台设备的永久唯一编号
}

// Dashboard 统计数据返回模型
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_downloads: i64,
    pub unique_downloads: i64,
    pub total_activations: i64,
    pub platform_downloads: Vec<PlatformStat>,
    pub daily_trends: Vec<DailyStat>,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PlatformStat {
    pub platform: String,
    pub count: i64,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DailyStat {
    pub date: String,
    pub downloads: i64,
    pub activations: i64,
}

#[derive(Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SiteSettings {
    pub id: String,
    pub site_name: String,
    pub seo_title: String,
    pub seo_description: String,
    pub seo_keywords: String,
    pub github_url: String,
    pub twitter_url: String,
    pub discord_url: String,
    pub contact_email: String,
    pub copyright: String,
}

// 1. 缓存的 MC 更新数据
#[derive(Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct McUpdate {
    pub version: String, // 唯一主键
    pub v_type: String,  // release, snapshot 等
    pub title: String,
    pub cover: String,
    pub article: String,
    pub wiki_en: String,
    pub wiki_zh: String,
    pub date: String,
    pub created_at: Option<String>, // 数据库记录时间
}

// 2. 爬虫的配置与监控状态
#[derive(Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct McCrawlerConfig {
    pub id: String,
    pub interval_minutes: i32,             // 抓取周期 (分钟)
    pub request_count: i64,                // 客户端请求次数统计
    pub last_crawl_time: Option<String>,   // 上次抓取时间
    pub last_crawl_status: Option<String>, // 上次抓取状态 (成功 / 报错信息)
}

// 3. 管理员修改爬虫频率的请求体
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMcCrawlerConfig {
    pub interval_minutes: i32,
}

// ==================== Tauri Updater 发行模型 ====================

// 1. 前端控制台提交的发布表单
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishReleasePayload {
    pub version_id: String,
    pub display_version: String,
    pub date: String,
    pub channel: String,
    pub rollout_type: String,
    pub rollout_value: String,
    pub allowed_regions: String,
    pub platforms: serde_json::Value, // 存放包 url 和 signature
    pub changes: serde_json::Value,   // 存放更新内容的 JSON 数组
}

// 2. 数据库中存储的发行版实体
#[allow(dead_code)] // 【新增】告诉编译器忽略未使用字段的警告
#[derive(sqlx::FromRow)]
pub struct AppReleaseRow {
    pub id: String,
    pub version: String,
    pub display_version: String,
    pub date: String,
    pub channel: String,
    pub rollout_type: String,
    pub rollout_value: String,
    pub allowed_regions: String,
    pub status: String,
    pub platforms_json: String,
    pub changes_json: String,
    pub created_at: Option<String>,
}

// 3. Tauri 客户端请求更新时携带的参数
#[allow(dead_code)] // 【新增】告诉编译器忽略未使用字段的警告
#[derive(serde::Deserialize, Debug)]
pub struct UpdaterParams {
    pub version: String,
    pub target: Option<String>,
    pub arch: Option<String>,
    pub uuid: Option<String>,
    pub region: Option<String>,
}

// ==================== 服务器发现页模型 ====================

// 1. 通用的图文标签模型
#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IconTag {
    pub label: String,    // 标签文字
    pub icon_svg: String, // SVG 代码
    pub color: String,    // 颜色 Hex
}

// 2. 数据库实体模型
#[derive(serde::Serialize, serde::Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ServerSubmission {
    pub id: String,
    pub name: String,
    pub description: String,
    pub ip: String,
    pub port: i32,
    pub versions: sqlx::types::Json<Vec<String>>,
    pub max_players: i32,
    pub online_players: i32,
    pub icon: String,
    pub hero: String,
    pub website: String,
    pub server_type: String, // vanilla / plugin / modded
    pub language: String,
    pub modpack_url: String,
    pub has_paid_content: bool,     // 【新增】氪金内容标识
    pub age_recommendation: String, // 【新增】年龄分级
    pub social_links: sqlx::types::Json<Vec<SocialLink>>,
    pub has_voice_chat: bool,
    pub voice_platform: String,
    pub voice_url: String,
    pub features: sqlx::types::Json<Vec<IconTag>>,
    pub mechanics: sqlx::types::Json<Vec<IconTag>>,
    pub elements: sqlx::types::Json<Vec<IconTag>>,
    pub community: sqlx::types::Json<Vec<IconTag>>,
    pub tags: sqlx::types::Json<Vec<String>>,

    pub created_at: Option<String>,
    pub verified: bool,
}

// 3. 创建服务器的请求体
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateServerSubmissionPayload {
    pub name: String,
    pub description: String,
    pub ip: String,
    pub port: i32,
    pub versions: Vec<String>,
    pub max_players: i32,
    pub online_players: i32,
    pub icon: String,
    pub hero: String,
    pub website: String,
    pub server_type: String,
    pub language: String,
    pub modpack_url: String,
    pub has_paid_content: bool,
    pub age_recommendation: String,
    pub social_links: sqlx::types::Json<Vec<SocialLink>>,
    pub has_voice_chat: bool,
    pub voice_platform: String,
    pub voice_url: String,
    pub features: Vec<IconTag>,
    pub mechanics: Vec<IconTag>,
    pub elements: Vec<IconTag>,
    pub community: Vec<IconTag>,
    pub tags: Vec<String>,
}

// 4. 更新服务器的请求体 (比创建多了 verified 字段)
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateServerSubmissionPayload {
    pub name: String,
    pub description: String,
    pub ip: String,
    pub port: i32,
    pub versions: Vec<String>,
    pub max_players: i32,
    pub online_players: i32,
    pub icon: String,
    pub hero: String,
    pub website: String,
    pub server_type: String,
    pub language: String,
    pub modpack_url: String,
    pub has_paid_content: bool,
    pub age_recommendation: String,
    pub social_links: sqlx::types::Json<Vec<SocialLink>>,
    pub has_voice_chat: bool,
    pub voice_platform: String,
    pub voice_url: String,
    pub features: Vec<IconTag>,
    pub mechanics: Vec<IconTag>,
    pub elements: Vec<IconTag>,
    pub community: Vec<IconTag>,
    pub tags: Vec<String>,
    pub verified: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ServerTagDict {
    pub id: String,
    pub category: String, // 'features', 'mechanics', 'elements', 'community'
    pub label: String,
    pub icon_svg: String,
    pub color: String, // 允许在数据库中为每个标签自定义颜色
    pub priority: i32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SocialLink {
    pub platform: String,
    pub url: String,
}

// backend/src/models.rs (追加到文件末尾)

// 【新增】接收前端新增/修改标签字典的请求体
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerTagDictPayload {
    pub category: String,
    pub label: String,
    pub icon_svg: String,
    pub color: String,
    pub priority: i32,
}

// ==================== API Key 管理与访问日志 ====================

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ApiKey {
    pub id: String,
    pub name: String,
    pub key: String,
    pub scopes: Option<String>, // 逗号分隔的 path 前缀，留空表示全量权限
    pub rate_limit_per_minute: i32,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub last_used_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyCreatePayload {
    pub name: String,
    pub scopes: Option<String>,
    pub rate_limit_per_minute: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyUpdatePayload {
    pub name: String,
    pub scopes: Option<String>,
    pub rate_limit_per_minute: i32,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ApiAccessLog {
    pub id: i64,
    pub key_id: Option<String>,
    pub path: String,
    pub method: String,
    pub status: i32,
    pub ip: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ApiEndpointPolicy {
    pub id: i64,
    pub method: String,
    pub path_template: String,
    pub group_name: String, // public / admin / auth
    pub public_enabled: bool,
    pub require_api_key: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateApiEndpointPolicyPayload {
    pub public_enabled: bool,
    pub require_api_key: bool,
}

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
    pub tags: Json<Vec<String>>,    // 数组以 JSON 存入
    pub price: String,
    pub link: String,
    pub regions: Json<Vec<String>>, // 数组以 JSON 存入
    pub priority: i32,
    pub border_color: String,
    pub background_color: String,
    pub text_color: String,
    pub enabled: bool,              // 独立禁用开关 (SQLite 中为 0/1)
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
    pub email: String,     // 【新增】
    pub password: String,
}

// 3. 返回给前端的登录结果
#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
}

// 【新增】第一次初始化的请求体
#[derive(Deserialize)]
pub struct InitPayload {
    pub email: String,
    pub password: String,
}

// 【新增】数据库中的用户映射模型
#[derive(FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub password_hash: String,
}

#[derive(Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Feature {
    pub id: String,
    pub icon_svg: String,   // 直接存储 SVG 代码字符串
    pub icon_color: String,
    pub title: String,
    pub desc: String,       // 次要文字
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
    pub platform: String,    // "macOS", "Windows", "Linux"
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
    pub version: String,     // 唯一主键
    pub v_type: String,      // release, snapshot 等
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
    pub interval_minutes: i32,       // 抓取周期 (分钟)
    pub request_count: i64,          // 客户端请求次数统计
    pub last_crawl_time: Option<String>, // 上次抓取时间
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
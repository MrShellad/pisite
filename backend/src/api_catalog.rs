#[derive(Clone, Copy)]
pub struct ApiEndpointCatalogItem {
    pub method: &'static str,
    pub path: &'static str,
    pub group: &'static str, // public / admin / auth
}

// 注意：这里用的是 routes.rs 中的 path 模板（含 {id}）。
// 这个列表用于后台展示与权限控制的“真实来源”。
pub const API_CATALOG: &[ApiEndpointCatalogItem] = &[
    // ===== auth =====
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/auth/check-init",
        group: "auth",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/auth/init",
        group: "auth",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/auth/login",
        group: "auth",
    },
    // ===== public =====
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/settings",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/hero",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/features",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/faqs",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/sponsors",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/changelog",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/friends",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/mc/latest-update",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/mc/updates",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/mc/versions",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/server-submissions",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/server-submissions",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/server-status",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/server-submissions/upload-cover",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/track/download",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/track/activate",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/updater",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/server-tags-dict",
        group: "public",
    },
    // donors public
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/donors/login",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/donors/refresh",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/donors/me",
        group: "public",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/donors/supporters",
        group: "public",
    },
    // ===== admin =====
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/dashboard",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/settings",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/hero",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/features/all",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/features",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/features/{id}/toggle",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/features/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/faqs/all",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/faqs",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/faqs/{id}/toggle",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/faqs/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/sponsors/all",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/sponsors",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/sponsors/{id}/toggle",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/sponsors/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/changelog",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/changelog",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/changelog/{id}/rollback",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/changelog/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/upload",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/mc-crawler/config",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/mc-crawler/config",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/mc-crawler/cached",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/mc-crawler/force",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/mc-crawler/force-manifest",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/server-submissions",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/server-submissions/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/server-submissions/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/server-submissions/{id}/toggle-verify",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/server-status",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/server-status/config",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/server-status/config",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/server-status/run",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/server-status/history/{server_id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/server-tags-dict",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/server-tags-dict/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/server-tags-dict/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donor-users",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/donor-users",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/donor-users/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/donor-users/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donor-users/{user_id}/license",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/donor-users/{user_id}/license",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donor-users/{user_id}/donations",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/donor-donations",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donor-users/{user_id}/devices",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/donor-devices/{id}/toggle",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donor-users/{user_id}/activations",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/donor-users/{user_id}/mc-profile/sync",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donor-users/{user_id}/afdian",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/donor-users/{user_id}/afdian",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/donor-users/{user_id}/afdian/sync",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/donation-settings/afdian",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/donation-settings/afdian",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/api-keys",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/api-keys",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/api-keys/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/api-keys/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/api-logs",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/admin/signaling-servers",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "POST",
        path: "/api/admin/signaling-servers",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/signaling-servers/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "DELETE",
        path: "/api/admin/signaling-servers/{id}",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "PUT",
        path: "/api/admin/signaling-servers/{id}/toggle",
        group: "admin",
    },
    ApiEndpointCatalogItem {
        method: "GET",
        path: "/api/signaling-servers",
        group: "public",
    },
];

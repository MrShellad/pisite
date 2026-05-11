use sqlx::{
    SqlitePool,
    migrate::{MigrateError, Migrator},
};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");
const LEGACY_INITIAL_MIGRATION_VERSION: i64 = 202604250001;

pub async fn initialize_database(pool: &SqlitePool) {
    migrate_admin_users_table(pool).await;
    ensure_legacy_columns(pool).await;

    match MIGRATOR.run(pool).await {
        Ok(()) => {}
        Err(MigrateError::VersionMismatch(version))
            if version == LEGACY_INITIAL_MIGRATION_VERSION =>
        {
            eprintln!(
                "warning: migration {version} checksum differs from this build; continuing with legacy schema repair"
            );
        }
        Err(error) => panic!("failed to apply database migrations: {error}"),
    }

    ensure_legacy_columns(pool).await;
    ensure_column(pool, "article_pushes", "expires_at", "DATETIME").await;
    sync_api_endpoint_policies(pool).await;
    refresh_historical_donors(pool).await;
}

async fn ensure_legacy_columns(pool: &SqlitePool) {
    ensure_admin_security_config_table(pool).await;
    ensure_submission_email_templates_table(pool).await;
    ensure_feature_screenshots_table(pool).await;
    ensure_article_pushes_table(pool).await;
    ensure_client_installation_reports_table(pool).await;
    ensure_column(pool, "users", "mc_name", "TEXT").await;
    ensure_column(pool, "users", "afdian_user_id", "TEXT").await;
    ensure_column(
        pool,
        "hero_config",
        "flatpak_script",
        "TEXT NOT NULL DEFAULT ''",
    )
    .await;
    ensure_column(
        pool,
        "site_settings",
        "site_domain",
        "TEXT NOT NULL DEFAULT ''",
    )
    .await;
    ensure_column(
        pool,
        "server_submissions",
        "contact_email",
        "TEXT NOT NULL DEFAULT ''",
    )
    .await;
    ensure_column(
        pool,
        "server_submissions",
        "email_verified",
        "BOOLEAN NOT NULL DEFAULT 0",
    )
    .await;
    ensure_column(pool, "server_submissions", "email_verified_at", "DATETIME").await;
    ensure_column(pool, "server_submissions", "email_verification_id", "TEXT").await;
    ensure_column(
        pool,
        "server_submissions",
        "sort_id",
        "INTEGER NOT NULL DEFAULT 0",
    )
    .await;
    ensure_column(
        pool,
        "server_submissions",
        "owner_token_hash",
        "TEXT NOT NULL DEFAULT ''",
    )
    .await;
    ensure_column(
        pool,
        "server_submissions",
        "owner_token_issued_at",
        "DATETIME",
    )
    .await;
    ensure_column(
        pool,
        "server_submissions",
        "owner_offline",
        "BOOLEAN NOT NULL DEFAULT 0",
    )
    .await;
    ensure_column(
        pool,
        "submission_email_config",
        "email_subject_template",
        "TEXT NOT NULL DEFAULT 'Your verification code is: {code}'",
    )
    .await;
    ensure_column(
        pool,
        "submission_email_config",
        "email_body_template",
        "TEXT NOT NULL DEFAULT 'Your verification code is: {code}\r\nThis code expires in {ttl} minutes.\r\nIf you did not request a server submission verification, you can ignore this email.'",
    )
    .await;
}

async fn ensure_admin_security_config_table(pool: &SqlitePool) {
    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS admin_security_config (
            id TEXT PRIMARY KEY,
            session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
            turnstile_enabled BOOLEAN NOT NULL DEFAULT 0,
            turnstile_site_key TEXT NOT NULL DEFAULT '',
            turnstile_secret_key TEXT NOT NULL DEFAULT '',
            turnstile_secret_preview TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        r#"INSERT OR IGNORE INTO admin_security_config (
            id,
            session_timeout_minutes,
            turnstile_enabled,
            turnstile_site_key,
            turnstile_secret_key,
            turnstile_secret_preview
        ) VALUES ('default', 30, 0, '', '', NULL)"#,
    )
    .execute(pool)
    .await;
}

async fn ensure_submission_email_templates_table(pool: &SqlitePool) {
    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS submission_email_templates (
            template_key TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            subject_template TEXT NOT NULL,
            html_body_template TEXT NOT NULL,
            variables TEXT NOT NULL DEFAULT '[]',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        r#"INSERT OR IGNORE INTO submission_email_templates (
            template_key, label, description, subject_template, html_body_template, variables
        )
        SELECT
            'verification_code',
            '验证码模板',
            '服务器提交前发送给联系邮箱的验证码邮件。',
            email_subject_template,
            email_body_template,
            '["code","ttl"]'
        FROM submission_email_config
        WHERE id = '1'"#,
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        r#"INSERT OR IGNORE INTO submission_email_templates (
            template_key, label, description, subject_template, html_body_template, variables
        ) VALUES (
            'server_owner_code',
            '提交服务器的 Code 邮件',
            '服务器首次审核通过后发送给提交者的管理 Code 邮件。',
            '您的服务器「{serverName}」已通过审核',
            '<p>您好，</p><p>您的服务器「{serverName}」已通过审核并上线。</p><p>服务器管理 Code：<strong>{code}</strong></p><p>您可以在服务器提交页面的“修改服务器信息”入口，使用原始邮箱地址和该 Code 修改服务器资料或下线服务器。</p><p>请妥善保存该 Code，不要公开分享。</p>',
            '["serverName","code","contactEmail"]'
        )"#,
    )
    .execute(pool)
    .await;
}

async fn ensure_feature_screenshots_table(pool: &SqlitePool) {
    let _ = sqlx::query(
        "CREATE TABLE IF NOT EXISTS feature_screenshots (
            id TEXT PRIMARY KEY,
            image_url TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            caption TEXT NOT NULL DEFAULT '',
            priority INTEGER NOT NULL DEFAULT 0
        )",
    )
    .execute(pool)
    .await;
}

async fn ensure_article_pushes_table(pool: &SqlitePool) {
    let _ = sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS article_pushes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            cover TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            related_link TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT '',
            enabled BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_article_pushes_enabled_created ON article_pushes (enabled, created_at)",
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_article_pushes_category ON article_pushes (category)",
    )
    .execute(pool)
    .await;
}

async fn ensure_client_installation_reports_table(pool: &SqlitePool) {
    let _ = sqlx::query(
        "CREATE TABLE IF NOT EXISTS client_installation_reports (
            installation_id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            memory_bytes INTEGER,
            gpu TEXT NOT NULL DEFAULT '',
            app_version TEXT NOT NULL DEFAULT '',
            first_installed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(pool)
    .await;
}

async fn sync_api_endpoint_policies(pool: &SqlitePool) {
    for item in crate::api_catalog::API_CATALOG {
        let _ = sqlx::query(
            r#"INSERT OR IGNORE INTO api_endpoint_policies (
                method, path_template, group_name, public_enabled, require_api_key
            ) VALUES (?, ?, ?, 1, 0)"#,
        )
        .bind(item.method)
        .bind(item.path)
        .bind(item.group)
        .execute(pool)
        .await;
    }

    let _ = sqlx::query(
        r#"DELETE FROM api_endpoint_policies
         WHERE path_template IN (
            '/api/right-click-servers',
            '/api/admin/right-click-servers',
            '/api/admin/right-click-servers/{id}',
            '/api/admin/right-click-servers/{id}/toggle'
         )"#,
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        r#"INSERT INTO api_endpoint_policies (
            method, path_template, group_name, public_enabled, require_api_key
        ) VALUES ('GET', '/api/signaling-servers', 'public', 1, 1)
        ON CONFLICT(method, path_template) DO UPDATE SET require_api_key = 1;"#,
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        r#"INSERT INTO api_endpoint_policies (
            method, path_template, group_name, public_enabled, require_api_key
        ) VALUES ('GET', '/api/donors/supporters', 'public', 1, 1)
        ON CONFLICT(method, path_template) DO UPDATE SET require_api_key = 1;"#,
    )
    .execute(pool)
    .await;
}

async fn refresh_historical_donors(pool: &SqlitePool) {
    if let Ok(existing_user_ids) = sqlx::query_as::<_, (String,)>("SELECT id FROM users")
        .fetch_all(pool)
        .await
    {
        for (user_id,) in existing_user_ids {
            let _ = crate::donor_support::refresh_historical_donor(pool, &user_id, None).await;
        }
    }
}

async fn migrate_admin_users_table(pool: &SqlitePool) {
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

    let columns: Vec<(i64, String, String, i64, Option<String>, i64)> =
        sqlx::query_as("PRAGMA table_info(users)")
            .fetch_all(pool)
            .await
            .unwrap_or_default();

    if columns.iter().any(|column| column.1 == "mc_uuid") {
        return;
    }

    let _ = sqlx::query("ALTER TABLE users RENAME TO admin_users")
        .execute(pool)
        .await;
}

async fn table_has_column(pool: &SqlitePool, table: &str, column: &str) -> bool {
    let pragma = format!("PRAGMA table_info({table})");
    let columns: Vec<(i64, String, String, i64, Option<String>, i64)> = sqlx::query_as(&pragma)
        .fetch_all(pool)
        .await
        .unwrap_or_default();

    columns
        .iter()
        .any(|existing_column| existing_column.1 == column)
}

async fn table_exists(pool: &SqlitePool, table: &str) -> bool {
    let result: Option<(String,)> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
            .bind(table)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    result.is_some()
}

async fn ensure_column(pool: &SqlitePool, table: &str, column: &str, definition: &str) {
    if !table_exists(pool, table).await {
        return;
    }

    if table_has_column(pool, table, column).await {
        return;
    }

    let sql = format!("ALTER TABLE {table} ADD COLUMN {column} {definition}");
    let _ = sqlx::query(&sql).execute(pool).await;
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn migrations_are_applied_to_fresh_database() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("failed to create test database");

        initialize_database(&pool).await;

        let migrations_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM _sqlx_migrations")
            .fetch_one(&pool)
            .await
            .expect("failed to query migrations table");
        assert!(migrations_count.0 >= 1);

        let hero_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hero_config")
            .fetch_one(&pool)
            .await
            .expect("failed to query hero config");
        assert_eq!(hero_count.0, 1);
    }
}

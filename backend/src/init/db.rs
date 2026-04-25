use sqlx::{SqlitePool, migrate::Migrator};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn initialize_database(pool: &SqlitePool) {
    migrate_admin_users_table(pool).await;
    ensure_legacy_columns(pool).await;

    MIGRATOR
        .run(pool)
        .await
        .expect("failed to apply database migrations");

    ensure_legacy_columns(pool).await;
    sync_api_endpoint_policies(pool).await;
    refresh_historical_donors(pool).await;
}

async fn ensure_legacy_columns(pool: &SqlitePool) {
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

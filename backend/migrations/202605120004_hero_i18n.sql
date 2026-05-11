-- Hero i18n columns are added by initialize_database via ensure_column.
-- Keeping this migration as a no-op avoids duplicate-column failures on
-- databases that were repaired before sqlx records this migration.
SELECT 1;

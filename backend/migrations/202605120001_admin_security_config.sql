CREATE TABLE IF NOT EXISTS admin_security_config (
    id TEXT PRIMARY KEY,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    turnstile_enabled BOOLEAN NOT NULL DEFAULT 0,
    turnstile_site_key TEXT NOT NULL DEFAULT '',
    turnstile_secret_key TEXT NOT NULL DEFAULT '',
    turnstile_secret_preview TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO admin_security_config (
    id,
    session_timeout_minutes,
    turnstile_enabled,
    turnstile_site_key,
    turnstile_secret_key,
    turnstile_secret_preview
) VALUES (
    'default',
    30,
    0,
    '',
    '',
    NULL
);

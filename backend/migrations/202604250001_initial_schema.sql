CREATE TABLE IF NOT EXISTS sponsors (
    id TEXT PRIMARY KEY,
    icon TEXT NOT NULL,
    name TEXT NOT NULL,
    desc TEXT NOT NULL,
    tags TEXT NOT NULL,
    price TEXT NOT NULL,
    link TEXT NOT NULL,
    regions TEXT NOT NULL,
    priority INTEGER NOT NULL,
    border_color TEXT NOT NULL,
    background_color TEXT NOT NULL,
    text_color TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    mc_uuid TEXT UNIQUE NOT NULL,
    mc_name TEXT,
    email TEXT,
    afdian_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_afdian_user_id
ON users(afdian_user_id)
WHERE afdian_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    donated_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    is_beta_enabled BOOLEAN NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_uuid TEXT NOT NULL,
    device_name TEXT NOT NULL,
    last_seen_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    UNIQUE(user_id, device_uuid),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    issued_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    last_refresh_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS historical_donors (
    user_id TEXT PRIMARY KEY,
    mc_uuid TEXT NOT NULL,
    mc_name TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    started_at DATETIME,
    last_donated_at DATETIME,
    is_visible BOOLEAN NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historical_donors_visible_last
ON historical_donors(is_visible, last_donated_at DESC);

CREATE TABLE IF NOT EXISTS afdian_sponsors (
    user_id TEXT PRIMARY KEY,
    all_sum_amount REAL NOT NULL DEFAULT 0,
    first_pay_time INTEGER,
    last_pay_time INTEGER,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS afdian_config (
    id TEXT PRIMARY KEY,
    creator_user_id TEXT,
    token_encrypted TEXT,
    token_preview TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    icon_svg TEXT NOT NULL,
    icon_color TEXT NOT NULL,
    title TEXT NOT NULL,
    desc TEXT NOT NULL,
    priority INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS app_releases (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    display_version TEXT NOT NULL,
    date TEXT NOT NULL,
    channel TEXT NOT NULL,
    rollout_type TEXT NOT NULL,
    rollout_value TEXT NOT NULL,
    allowed_regions TEXT NOT NULL,
    status TEXT NOT NULL,
    platforms_json TEXT NOT NULL,
    changes_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    icon_svg TEXT NOT NULL,
    icon_color TEXT NOT NULL,
    priority INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hero_config (
    id TEXT PRIMARY KEY,
    logo_url TEXT NOT NULL,
    logo_color TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    button_text TEXT NOT NULL,
    update_date TEXT NOT NULL,
    dl_mac TEXT NOT NULL,
    dl_win TEXT NOT NULL,
    dl_linux TEXT NOT NULL,
    flatpak_script TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO hero_config (
    id,
    logo_url,
    logo_color,
    title,
    subtitle,
    description,
    button_text,
    update_date,
    dl_mac,
    dl_win,
    dl_linux,
    flatpak_script
) VALUES (
    '1',
    '',
    '#2f9e44',
    'Connect and Automate',
    'Power your workflow',
    'FlowCore is a fast productivity tool for developers and teams.',
    'Download FlowCore Pro',
    '2026-03-04',
    '#',
    '#',
    '#',
    ''
);

CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    site_name TEXT NOT NULL,
    seo_title TEXT NOT NULL,
    seo_description TEXT NOT NULL,
    seo_keywords TEXT NOT NULL,
    github_url TEXT NOT NULL,
    twitter_url TEXT NOT NULL,
    discord_url TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    copyright TEXT NOT NULL
);

INSERT OR IGNORE INTO site_settings (
    id,
    site_name,
    seo_title,
    seo_description,
    seo_keywords,
    github_url,
    twitter_url,
    discord_url,
    contact_email,
    copyright
) VALUES (
    '1',
    'FlowCore',
    'FlowCore - 极速跨平台工具',
    '专为开发者与团队打造的高效工具。',
    'Rust,工具,跨平台',
    'https://github.com',
    '',
    '',
    'admin@flowcore.app',
    '2026 FlowCore Inc. 保留所有权利。'
);

CREATE TABLE IF NOT EXISTS friend_links (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    href TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT 1
);

INSERT INTO friend_links (id, name, href, sort_order, enabled)
SELECT *
FROM (
    SELECT 'seed-rust' AS id, 'Rust' AS name, 'https://www.rust-lang.org/' AS href, 0 AS sort_order, 1 AS enabled
    UNION ALL
    SELECT 'seed-tauri', 'Tauri', 'https://tauri.app/', 1, 1
    UNION ALL
    SELECT 'seed-vite', 'Vite', 'https://vite.dev/', 2, 1
    UNION ALL
    SELECT 'seed-github', 'GitHub', 'https://github.com/', 3, 1
) AS defaults
WHERE NOT EXISTS (SELECT 1 FROM friend_links LIMIT 1);

CREATE TABLE IF NOT EXISTS downloads_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL,
    ip TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_activations (
    device_uuid TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    ip TEXT NOT NULL,
    os_version TEXT,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mc_updates (
    version TEXT PRIMARY KEY,
    v_type TEXT NOT NULL,
    title TEXT NOT NULL,
    cover TEXT NOT NULL,
    article TEXT NOT NULL,
    wiki_en TEXT NOT NULL,
    wiki_zh TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mc_version_manifest (
    id TEXT PRIMARY KEY,
    v_type TEXT NOT NULL,
    release_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mc_crawler_config (
    id TEXT PRIMARY KEY,
    interval_minutes INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    last_crawl_time DATETIME,
    last_crawl_status TEXT
);

INSERT OR IGNORE INTO mc_crawler_config (
    id,
    interval_minutes,
    request_count,
    last_crawl_status
) VALUES (
    '1',
    60,
    0,
    '等待首次抓取...'
);

CREATE TABLE IF NOT EXISTS server_submissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    versions TEXT NOT NULL DEFAULT '[]',
    max_players INTEGER NOT NULL,
    online_players INTEGER NOT NULL,
    icon TEXT NOT NULL,
    hero TEXT NOT NULL,
    contact_email TEXT NOT NULL DEFAULT '',
    email_verified BOOLEAN NOT NULL DEFAULT 0,
    email_verified_at DATETIME,
    email_verification_id TEXT,
    website TEXT NOT NULL,
    server_type TEXT NOT NULL,
    language TEXT NOT NULL,
    modpack_url TEXT NOT NULL DEFAULT '',
    has_paid_content BOOLEAN NOT NULL DEFAULT 0,
    age_recommendation TEXT NOT NULL DEFAULT '全年龄',
    social_links TEXT NOT NULL DEFAULT '[]',
    has_voice_chat BOOLEAN NOT NULL DEFAULT 0,
    voice_platform TEXT NOT NULL DEFAULT '',
    voice_url TEXT NOT NULL DEFAULT '',
    features TEXT NOT NULL DEFAULT '[]',
    mechanics TEXT NOT NULL DEFAULT '[]',
    elements TEXT NOT NULL DEFAULT '[]',
    community TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    sort_id INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_server_submissions_contact_email
ON server_submissions(contact_email);

CREATE TABLE IF NOT EXISTS submission_email_config (
    id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT 0,
    smtp_host TEXT NOT NULL DEFAULT '',
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username TEXT NOT NULL DEFAULT '',
    smtp_password TEXT NOT NULL DEFAULT '',
    smtp_from_email TEXT NOT NULL DEFAULT '',
    smtp_from_name TEXT NOT NULL DEFAULT '',
    smtp_reply_to TEXT NOT NULL DEFAULT '',
    smtp_security TEXT NOT NULL DEFAULT 'starttls',
    smtp_auth TEXT NOT NULL DEFAULT 'plain',
    code_ttl_minutes INTEGER NOT NULL DEFAULT 15,
    resend_cooldown_seconds INTEGER NOT NULL DEFAULT 60,
    max_verify_attempts INTEGER NOT NULL DEFAULT 5,
    email_subject_template TEXT NOT NULL DEFAULT 'Your verification code is: {code}',
    email_body_template TEXT NOT NULL DEFAULT 'Your verification code is: {code}
This code expires in {ttl} minutes.
If you did not request a server submission verification, you can ignore this email.',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO submission_email_config (
    id,
    enabled,
    smtp_host,
    smtp_port,
    smtp_username,
    smtp_password,
    smtp_from_email,
    smtp_from_name,
    smtp_reply_to,
    smtp_security,
    smtp_auth,
    code_ttl_minutes,
    resend_cooldown_seconds,
    max_verify_attempts,
    email_subject_template,
    email_body_template
) VALUES (
    '1',
    0,
    '',
    587,
    '',
    '',
    '',
    '',
    '',
    'starttls',
    'plain',
    15,
    60,
    5,
    '您的验证码是: {code}',
    '您的验证码是: {code}
该验证码在 {ttl} 分钟内有效。
如果这不是您的操作，请忽略此邮件。'
);

CREATE TABLE IF NOT EXISTS submission_email_rules (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_email_rules_mode_enabled
ON submission_email_rules(mode, enabled, priority DESC);

CREATE TABLE IF NOT EXISTS submission_email_verifications (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    verification_token TEXT,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME,
    consumed_at DATETIME,
    server_submission_id TEXT,
    last_sent_at DATETIME,
    send_count INTEGER NOT NULL DEFAULT 1,
    verify_attempts INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(server_submission_id) REFERENCES server_submissions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_email_verifications_email
ON submission_email_verifications(email, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_email_verifications_token
ON submission_email_verifications(verification_token)
WHERE verification_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS server_tags_dict (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    icon_svg TEXT NOT NULL,
    color TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0
);

INSERT INTO server_tags_dict (id, category, label, icon_svg, color, priority)
SELECT *
FROM (
    SELECT '1' AS id, 'features' AS category, 'Vanilla' AS label, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>' AS icon_svg, '#10b981' AS color, 0 AS priority
    UNION ALL
    SELECT '2', 'mechanics', 'PVP', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>', '#f97316', 0
    UNION ALL
    SELECT '3', 'elements', 'Magic', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>', '#8b5cf6', 0
    UNION ALL
    SELECT '4', 'community', 'Voice Chat', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>', '#0ea5e9', 0
) AS defaults
WHERE NOT EXISTS (SELECT 1 FROM server_tags_dict LIMIT 1);

CREATE TABLE IF NOT EXISTS server_status (
    server_id TEXT PRIMARY KEY,
    online_players INTEGER NOT NULL DEFAULT 0,
    max_players INTEGER NOT NULL DEFAULT 0,
    is_online BOOLEAN NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY(server_id) REFERENCES server_submissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    online_players INTEGER NOT NULL,
    max_players INTEGER NOT NULL,
    is_online BOOLEAN NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(server_id) REFERENCES server_submissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_ping_config (
    id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    interval_seconds INTEGER NOT NULL DEFAULT 120,
    batch_size INTEGER NOT NULL DEFAULT 20,
    timeout_ms INTEGER NOT NULL DEFAULT 3000,
    ttl_seconds INTEGER NOT NULL DEFAULT 300,
    cursor INTEGER NOT NULL DEFAULT 0,
    last_run_at DATETIME,
    last_run_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_server_status_expires_at
ON server_status(expires_at);

CREATE INDEX IF NOT EXISTS idx_server_status_history_server_time
ON server_status_history(server_id, recorded_at DESC);

INSERT OR IGNORE INTO server_ping_config (
    id,
    enabled,
    interval_seconds,
    batch_size,
    timeout_ms,
    ttl_seconds,
    cursor,
    last_run_status
) VALUES (
    '1',
    1,
    120,
    20,
    3000,
    300,
    0,
    'waiting first run'
);

CREATE TABLE IF NOT EXISTS signaling_servers (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    region TEXT NOT NULL,
    provider TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 1,
    secure BOOLEAN NOT NULL DEFAULT 1,
    features_p2p BOOLEAN NOT NULL DEFAULT 1,
    features_relay BOOLEAN NOT NULL DEFAULT 0,
    limits_max_connections INTEGER NOT NULL DEFAULT 1000,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    scopes TEXT,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

CREATE TABLE IF NOT EXISTS api_access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id TEXT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_endpoint_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path_template TEXT NOT NULL,
    group_name TEXT NOT NULL,
    public_enabled BOOLEAN NOT NULL DEFAULT 1,
    require_api_key BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(method, path_template)
);

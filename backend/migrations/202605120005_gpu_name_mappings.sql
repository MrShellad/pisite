CREATE TABLE IF NOT EXISTS gpu_name_mappings (
    id TEXT PRIMARY KEY,
    match_text TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gpu_name_mappings_enabled_priority
    ON gpu_name_mappings (enabled, priority);

INSERT OR IGNORE INTO gpu_name_mappings (
    id, match_text, display_name, priority, enabled
) VALUES (
    'builtin-amd-phoenix1-780m',
    'Phoenix1',
    'AMD 780M',
    100,
    1
);

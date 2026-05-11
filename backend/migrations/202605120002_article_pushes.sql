CREATE TABLE IF NOT EXISTS article_pushes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    cover TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    related_link TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_pushes_enabled_created
ON article_pushes (enabled, created_at);

CREATE INDEX IF NOT EXISTS idx_article_pushes_category
ON article_pushes (category);

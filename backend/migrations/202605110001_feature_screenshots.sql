CREATE TABLE IF NOT EXISTS feature_screenshots (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 0
);

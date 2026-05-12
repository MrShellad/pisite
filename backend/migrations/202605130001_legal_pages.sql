CREATE TABLE IF NOT EXISTS legal_pages (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content_html TEXT NOT NULL DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO legal_pages (slug, title, content_html)
VALUES
    (
        'privacy',
        '隐私政策',
        '<p>这里填写隐私政策正文。请在后台“隐私与条款”页面更新。</p>'
    ),
    (
        'terms',
        '服务条款',
        '<p>这里填写服务条款正文。请在后台“隐私与条款”页面更新。</p>'
    );

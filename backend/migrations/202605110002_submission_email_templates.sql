CREATE TABLE IF NOT EXISTS submission_email_templates (
    template_key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    subject_template TEXT NOT NULL,
    html_body_template TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '[]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO submission_email_templates (
    template_key,
    label,
    description,
    subject_template,
    html_body_template,
    variables
)
SELECT
    'verification_code',
    '验证码模板',
    '服务器提交前发送给联系邮箱的验证码邮件。',
    email_subject_template,
    email_body_template,
    '["code","ttl"]'
FROM submission_email_config
WHERE id = '1';

INSERT OR IGNORE INTO submission_email_templates (
    template_key,
    label,
    description,
    subject_template,
    html_body_template,
    variables
) VALUES (
    'server_owner_code',
    '提交服务器的 Code 邮件',
    '服务器首次审核通过后发送给提交者的管理 Code 邮件。',
    '您的服务器「{serverName}」已通过审核',
    '<p>您好，</p><p>您的服务器「{serverName}」已通过审核并上线。</p><p>服务器管理 Code：<strong>{code}</strong></p><p>您可以在服务器提交页面的“修改服务器信息”入口，使用原始邮箱地址和该 Code 修改服务器资料或下线服务器。</p><p>请妥善保存该 Code，不要公开分享。</p>',
    '["serverName","code","contactEmail"]'
);

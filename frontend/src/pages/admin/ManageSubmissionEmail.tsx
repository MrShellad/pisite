import { useEffect, useState } from 'react';
import { Mail, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { api } from '@/api/client';
import type {
  SubmissionEmailConfig,
  SubmissionEmailConfigUpdatePayload,
  SubmissionEmailRule,
  SubmissionEmailRulePayload,
  SubmissionEmailTemplate,
  SubmissionEmailTemplateKey,
  SubmissionEmailTemplateUpdatePayload,
} from '@/types';
import { useAdminFeedback } from './components/AdminFeedback';

const emptyRule: SubmissionEmailRulePayload = {
  mode: 'whitelist',
  patternType: 'domain_suffix',
  pattern: '',
  description: '',
  priority: 100,
  enabled: true,
};

const templateVariables: Record<SubmissionEmailTemplateKey, Array<{ key: string; label: string }>> = {
  verification_code: [
    { key: 'code', label: '验证码' },
    { key: 'ttl', label: '有效期分钟数' },
  ],
  server_owner_code: [
    { key: 'serverName', label: '服务器名称' },
    { key: 'code', label: '服务器管理 Code' },
    { key: 'contactEmail', label: '提交者邮箱' },
  ],
};

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

export default function ManageSubmissionEmail() {
  const { confirm } = useAdminFeedback();
  const [config, setConfig] = useState<SubmissionEmailConfig | null>(null);
  const [rules, setRules] = useState<SubmissionEmailRule[]>([]);
  const [templates, setTemplates] = useState<SubmissionEmailTemplate[]>([]);
  const [activeTemplateKey, setActiveTemplateKey] =
    useState<SubmissionEmailTemplateKey>('verification_code');
  const [passwordInput, setPasswordInput] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [newRule, setNewRule] = useState<SubmissionEmailRulePayload>(emptyRule);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [savingRuleIds, setSavingRuleIds] = useState<string[]>([]);
  const [deletingRuleIds, setDeletingRuleIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-black/35 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:bg-orange-500/5';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400';
  const cardClass =
    'rounded-2xl border border-neutral-200/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none';
  const activeTemplate = templates.find((template) => template.templateKey === activeTemplateKey) ?? templates[0] ?? null;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [configRes, rulesRes, templatesRes] = await Promise.all([
        api.get<SubmissionEmailConfig>('/admin/submission-email/config'),
        api.get<SubmissionEmailRule[]>('/admin/submission-email/rules'),
        api.get<SubmissionEmailTemplate[]>('/admin/submission-email/templates'),
      ]);
      setConfig(configRes.data);
      setRules(rulesRes.data);
      setTemplates(templatesRes.data);
      if (
        templatesRes.data.length > 0 &&
        !templatesRes.data.some((template) => template.templateKey === activeTemplateKey)
      ) {
        setActiveTemplateKey(templatesRes.data[0].templateKey);
      }
    } catch (requestError) {
      console.error('Failed to load submission email config', requestError);
      setError('加载邮箱验证配置失败。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleConfigChange = <K extends keyof SubmissionEmailConfig>(
    key: K,
    value: SubmissionEmailConfig[K],
  ) => {
    setConfig((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSecurityChange = (security: SubmissionEmailConfig['smtpSecurity']) => {
    setConfig((current) => {
      if (!current) return current;
      let newPort = current.smtpPort;
      if (security === 'starttls') newPort = 587;
      else if (security === 'tls') newPort = 465;
      else if (security === 'none') newPort = 25;

      return {
        ...current,
        smtpSecurity: security,
        smtpPort: newPort,
        smtpAuth: security === 'none' ? 'none' : current.smtpAuth,
      };
    });
  };

  const handleAuthChange = (auth: SubmissionEmailConfig['smtpAuth']) => {
    setConfig((current) => {
      if (!current) return current;
      if (auth !== 'none' && current.smtpSecurity === 'none') {
        return { ...current, smtpAuth: auth, smtpSecurity: 'starttls', smtpPort: 587 };
      }
      return { ...current, smtpAuth: auth };
    });
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setIsSavingConfig(true);
    setError(null);
    setMessage(null);

    const payload: SubmissionEmailConfigUpdatePayload = {
      enabled: config.enabled,
      smtpHost: config.smtpHost.trim(),
      smtpPort: Number(config.smtpPort),
      smtpUsername: config.smtpUsername.trim(),
      smtpPassword: passwordInput.trim() ? passwordInput.trim() : null,
      clearSmtpPassword: clearPassword,
      smtpFromEmail: config.smtpFromEmail.trim(),
      smtpFromName: config.smtpFromName.trim(),
      smtpReplyTo: config.smtpReplyTo.trim(),
      smtpSecurity: config.smtpSecurity,
      smtpAuth: config.smtpSecurity === 'none' ? 'none' : config.smtpAuth,
      codeTtlMinutes: Number(config.codeTtlMinutes),
      resendCooldownSeconds: Number(config.resendCooldownSeconds),
      maxVerifyAttempts: Number(config.maxVerifyAttempts),
    };

    try {
      await api.put('/admin/submission-email/config', payload);
      setPasswordInput('');
      setClearPassword(false);
      setMessage('邮箱验证配置已保存。');
      await fetchData();
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '保存 SMTP 配置失败。');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      setError('请输入测试收件邮箱。');
      return;
    }

    setIsSendingTest(true);
    setError(null);
    setMessage(null);

    try {
      await api.post('/admin/submission-email/config/test', { toEmail: testEmail.trim() });
      setMessage('测试邮件已发送，请检查收件箱。');
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;
      
      let debugLog = '';
      if (backendMessage) {
        if (backendMessage.toLowerCase().includes('<!doctype html>') || backendMessage.toLowerCase().includes('<html')) {
          debugLog = '\n\n日志详情：\n服务器或反向代理返回了 HTML 页面（通常为 502/504 网关错误或连接超时），后端可能无法连接到目标 SMTP 服务器。';
        } else {
          debugLog = `\n\n日志详情：\n${backendMessage}`;
        }
      }
      
      setError(`测试发信失败。请检查 SMTP 配置。${debugLog}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const updateTemplate = (key: keyof SubmissionEmailTemplateUpdatePayload, value: string) => {
    setTemplates((current) =>
      current.map((template) =>
        template.templateKey === activeTemplateKey ? { ...template, [key]: value } : template,
      ),
    );
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate) return;

    setIsSavingTemplate(true);
    setError(null);
    setMessage(null);

    const payload: SubmissionEmailTemplateUpdatePayload = {
      subjectTemplate: activeTemplate.subjectTemplate.trim(),
      htmlBodyTemplate: activeTemplate.htmlBodyTemplate.trim(),
    };

    try {
      await api.put(`/admin/submission-email/templates/${activeTemplate.templateKey}`, payload);
      setMessage('邮件模板已保存。');
      await fetchData();
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '保存邮件模板失败。');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const updateRule = (id: string, patch: Partial<SubmissionEmailRule>) => {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const handleCreateRule = async () => {
    setIsCreatingRule(true);
    setError(null);
    setMessage(null);

    try {
      await api.post('/admin/submission-email/rules', newRule);
      setNewRule(emptyRule);
      setMessage('规则已创建。');
      await fetchData();
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '创建规则失败。');
    } finally {
      setIsCreatingRule(false);
    }
  };

  const handleSaveRule = async (rule: SubmissionEmailRule) => {
    setSavingRuleIds((current) => [...current, rule.id]);
    setError(null);
    setMessage(null);

    try {
      await api.put(`/admin/submission-email/rules/${rule.id}`, {
        mode: rule.mode,
        patternType: rule.patternType,
        pattern: rule.pattern,
        description: rule.description,
        priority: Number(rule.priority),
        enabled: rule.enabled,
      });
      setMessage('规则已更新。');
      await fetchData();
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '更新规则失败。');
    } finally {
      setSavingRuleIds((current) => current.filter((id) => id !== rule.id));
    }
  };

  const handleDeleteRule = async (id: string) => {
    const confirmed = await confirm({
      title: '删除邮箱过滤规则',
      description: '确定删除这条邮箱过滤规则吗？后续提交邮件会立即按新规则处理。',
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    setDeletingRuleIds((current) => [...current, id]);
    setError(null);
    setMessage(null);

    try {
      await api.delete(`/admin/submission-email/rules/${id}`);
      setMessage('规则已删除。');
      await fetchData();
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '删除规则失败。');
    } finally {
      setDeletingRuleIds((current) => current.filter((ruleId) => ruleId !== id));
    }
  };

  if (isLoading || !config) {
    return <div className="animate-pulse p-8 text-neutral-500 dark:text-neutral-400">Loading submission email settings...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
            <Mail className="text-orange-500" />
            邮箱验证
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">配置 SMTP、测试发信，并维护服务器投稿邮箱的过滤规则。</p>
        </div>

        <button
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {(message || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            error
              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}
        >
          {error || message}
        </div>
      )}

      <section className={cardClass}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
              <ShieldCheck size={18} className="text-orange-500" />
              SMTP 配置
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">用户发送验证码时会使用这里配置的发信服务器。</p>
          </div>
          <button
            onClick={() => void handleSaveConfig()}
            disabled={isSavingConfig}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <Save size={16} />
            {isSavingConfig ? '保存中...' : '保存配置'}
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-200 sm:col-span-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => handleConfigChange('enabled', event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            启用服务器投稿邮箱验证码
          </label>

          <div>
            <label className={labelClass}>SMTP Host</label>
            <input value={config.smtpHost} onChange={(event) => handleConfigChange('smtpHost', event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SMTP Port</label>
            <input type="number" value={config.smtpPort} onChange={(event) => handleConfigChange('smtpPort', Number(event.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>用户名</label>
            <input value={config.smtpUsername} onChange={(event) => handleConfigChange('smtpUsername', event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>新密码</label>
            <input type="password" value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} className={inputClass} placeholder={config.hasPassword ? '留空则保留当前密码' : '输入 SMTP 密码'} />
          </div>
          <div>
            <label className={labelClass}>发件邮箱</label>
            <input value={config.smtpFromEmail} onChange={(event) => handleConfigChange('smtpFromEmail', event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>发件名称</label>
            <input value={config.smtpFromName} onChange={(event) => handleConfigChange('smtpFromName', event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reply-To</label>
            <input value={config.smtpReplyTo} onChange={(event) => handleConfigChange('smtpReplyTo', event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>密码管理</label>
            <label className="flex h-[50px] items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-200">
              <input type="checkbox" checked={clearPassword} onChange={(event) => setClearPassword(event.target.checked)} className="h-4 w-4 accent-red-500" />
              清空现有 SMTP 密码
            </label>
          </div>
          <div>
            <label className={labelClass}>加密方式</label>
            <select value={config.smtpSecurity} onChange={(event) => handleSecurityChange(event.target.value as SubmissionEmailConfig['smtpSecurity'])} className={inputClass}>
              <option value="none">none</option>
              <option value="starttls">starttls</option>
              <option value="tls">tls</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>认证方式</label>
            <select value={config.smtpAuth} onChange={(event) => handleAuthChange(event.target.value as SubmissionEmailConfig['smtpAuth'])} className={inputClass}>
              <option value="none">none</option>
              <option value="plain">plain</option>
              <option value="login">login</option>
            </select>
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">使用认证时会自动要求 TLS 或 STARTTLS，避免 SMTP 凭据明文传输。</p>
          </div>
          <div>
            <label className={labelClass}>验证码有效期(分钟)</label>
            <input type="number" value={config.codeTtlMinutes} onChange={(event) => handleConfigChange('codeTtlMinutes', Number(event.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>重发冷却(秒)</label>
            <input type="number" value={config.resendCooldownSeconds} onChange={(event) => handleConfigChange('resendCooldownSeconds', Number(event.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>最大校验次数</label>
            <input type="number" value={config.maxVerifyAttempts} onChange={(event) => handleConfigChange('maxVerifyAttempts', Number(event.target.value))} className={inputClass} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <label className={labelClass}>测试收件邮箱</label>
            <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className={inputClass} placeholder="填写一个可用邮箱，验证 SMTP 是否可正常发送" />
          </div>
          <button
            onClick={() => void handleSendTest()}
            disabled={isSendingTest}
            className="inline-flex h-[50px] items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/15"
          >
            <Send size={16} />
            {isSendingTest ? '发送中...' : '发送测试邮件'}
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
              <Mail size={18} className="text-orange-500" />
              邮件模板
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              统一维护各功能使用的邮件内容，支持 HTML 模板编辑。
            </p>
          </div>
          <button
            onClick={() => void handleSaveTemplate()}
            disabled={isSavingTemplate || !activeTemplate}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <Save size={16} />
            {isSavingTemplate ? '保存中...' : '保存模板'}
          </button>
        </div>

        {templates.length > 0 && activeTemplate ? (
          <div className="space-y-5">
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/[0.04]">
              {templates.map((template) => {
                const isActive = template.templateKey === activeTemplateKey;
                return (
                  <button
                    key={template.templateKey}
                    type="button"
                    onClick={() => setActiveTemplateKey(template.templateKey)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? 'bg-white text-orange-600 shadow-sm dark:bg-orange-500/15 dark:text-orange-300 dark:shadow-none'
                        : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100'
                    }`}
                  >
                    {template.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white">{activeTemplate.label}</h4>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{activeTemplate.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(templateVariables[activeTemplate.templateKey] ?? []).map((variable) => (
                    <span
                      key={variable.key}
                      className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300"
                      title={variable.label}
                    >
                      {`{${variable.key}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>邮件标题模板</label>
              <input
                value={activeTemplate.subjectTemplate}
                onChange={(event) => updateTemplate('subjectTemplate', event.target.value)}
                className={inputClass}
                placeholder="例如：您的验证码是 {code}"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div>
                <label className={labelClass}>HTML 邮件正文模板</label>
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950">
                  <ReactQuill
                    theme="snow"
                    value={activeTemplate.htmlBodyTemplate}
                    onChange={(value) => updateTemplate('htmlBodyTemplate', value)}
                    modules={quillModules}
                    className="min-h-[280px] [&_.ql-container]:min-h-[230px] [&_.ql-container]:border-neutral-200 dark:[&_.ql-container]:border-white/10 [&_.ql-editor]:min-h-[230px] dark:[&_.ql-editor]:bg-neutral-950 dark:[&_.ql-editor]:text-neutral-100 dark:[&_.ql-editor.ql-blank:before]:text-neutral-500 [&_.ql-toolbar]:border-neutral-200 dark:[&_.ql-toolbar]:border-white/10 dark:[&_.ql-toolbar]:bg-neutral-900/80 dark:[&_.ql-toolbar_.ql-fill]:fill-neutral-300 dark:[&_.ql-toolbar_.ql-picker]:text-neutral-300 dark:[&_.ql-toolbar_.ql-stroke]:stroke-neutral-300"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>预览</label>
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950">
                  <div className="border-b border-neutral-100 px-4 py-3 text-sm font-bold text-neutral-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-100">
                    {activeTemplate.subjectTemplate || '邮件标题预览'}
                  </div>
                  <iframe
                    title="邮件模板预览"
                    sandbox=""
                    srcDoc={activeTemplate.htmlBodyTemplate || '<p></p>'}
                    className="h-[290px] w-full bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            暂无可用邮件模板。
          </div>
        )}
      </section>

      <section className={cardClass}>
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
            <Mail size={18} className="text-orange-500" />
            邮箱过滤规则
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">支持白名单、黑名单、邮箱后缀、精确邮箱和包含匹配。</p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-6">
          <select value={newRule.mode} onChange={(event) => setNewRule((current) => ({ ...current, mode: event.target.value as SubmissionEmailRulePayload['mode'] }))} className={inputClass}>
            <option value="whitelist">whitelist</option>
            <option value="blacklist">blacklist</option>
          </select>
          <select value={newRule.patternType} onChange={(event) => setNewRule((current) => ({ ...current, patternType: event.target.value as SubmissionEmailRulePayload['patternType'] }))} className={inputClass}>
            <option value="domain_suffix">domain_suffix</option>
            <option value="exact_email">exact_email</option>
            <option value="contains">contains</option>
          </select>
          <input value={newRule.pattern} onChange={(event) => setNewRule((current) => ({ ...current, pattern: event.target.value }))} className={`${inputClass} sm:col-span-2`} placeholder="例如 qq.com 或 admin@example.com" />
          <input type="number" value={newRule.priority} onChange={(event) => setNewRule((current) => ({ ...current, priority: Number(event.target.value) }))} className={inputClass} placeholder="priority" />
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 dark:border-white/10 dark:bg-black/35 dark:text-neutral-200">
            <input type="checkbox" checked={newRule.enabled} onChange={(event) => setNewRule((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4 accent-orange-500" />
            enabled
          </label>
          <input value={newRule.description} onChange={(event) => setNewRule((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} sm:col-span-5`} placeholder="备注，可选" />
          <button
            onClick={() => void handleCreateRule()}
            disabled={isCreatingRule}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 sm:col-span-1"
          >
            <Plus size={16} />
            {isCreatingRule ? '创建中...' : '新增规则'}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
              当前还没有邮箱过滤规则。
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-7">
                <select value={rule.mode} onChange={(event) => updateRule(rule.id, { mode: event.target.value as SubmissionEmailRule['mode'] })} className={inputClass}>
                  <option value="whitelist">whitelist</option>
                  <option value="blacklist">blacklist</option>
                </select>
                <select value={rule.patternType} onChange={(event) => updateRule(rule.id, { patternType: event.target.value as SubmissionEmailRule['patternType'] })} className={inputClass}>
                  <option value="domain_suffix">domain_suffix</option>
                  <option value="exact_email">exact_email</option>
                  <option value="contains">contains</option>
                </select>
                <input value={rule.pattern} onChange={(event) => updateRule(rule.id, { pattern: event.target.value })} className={`${inputClass} sm:col-span-2`} />
                <input type="number" value={rule.priority} onChange={(event) => updateRule(rule.id, { priority: Number(event.target.value) })} className={inputClass} />
                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-white/10 dark:bg-black/35 dark:text-neutral-200">
                  <input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })} className="h-4 w-4 accent-orange-500" />
                  enabled
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleSaveRule(rule)}
                    disabled={savingRuleIds.includes(rule.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  >
                    <Save size={16} />
                    保存
                  </button>
                  <button
                    onClick={() => void handleDeleteRule(rule.id)}
                    disabled={deletingRuleIds.includes(rule.id)}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input value={rule.description} onChange={(event) => updateRule(rule.id, { description: event.target.value })} className={`${inputClass} sm:col-span-7`} placeholder="备注，可选" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

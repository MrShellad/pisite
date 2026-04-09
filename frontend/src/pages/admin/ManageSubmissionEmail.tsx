import { useEffect, useState } from 'react';
import { Mail, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';

import { api } from '@/api/client';
import type {
  SubmissionEmailConfig,
  SubmissionEmailConfigUpdatePayload,
  SubmissionEmailRule,
  SubmissionEmailRulePayload,
} from '@/types';

const emptyRule: SubmissionEmailRulePayload = {
  mode: 'whitelist',
  patternType: 'domain_suffix',
  pattern: '',
  description: '',
  priority: 100,
  enabled: true,
};

export default function ManageSubmissionEmail() {
  const [config, setConfig] = useState<SubmissionEmailConfig | null>(null);
  const [rules, setRules] = useState<SubmissionEmailRule[]>([]);
  const [passwordInput, setPasswordInput] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [newRule, setNewRule] = useState<SubmissionEmailRulePayload>(emptyRule);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [savingRuleIds, setSavingRuleIds] = useState<string[]>([]);
  const [deletingRuleIds, setDeletingRuleIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:bg-white';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500';
  const cardClass = 'rounded-2xl border border-neutral-200/70 bg-white/85 p-6 shadow-sm backdrop-blur';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [configRes, rulesRes] = await Promise.all([
        api.get<SubmissionEmailConfig>('/admin/submission-email/config'),
        api.get<SubmissionEmailRule[]>('/admin/submission-email/rules'),
      ]);
      setConfig(configRes.data);
      setRules(rulesRes.data);
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
      smtpAuth: config.smtpAuth,
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

      setError(backendMessage || '测试发信失败。');
    } finally {
      setIsSendingTest(false);
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
    if (!window.confirm('确定删除这条邮箱过滤规则吗？')) return;

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
    return <div className="animate-pulse p-8 text-neutral-500">Loading submission email settings...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Mail className="text-orange-500" />
            邮箱验证
          </h2>
          <p className="mt-2 text-sm text-neutral-500">配置 SMTP、测试发信，并维护服务器投稿邮箱的过滤规则。</p>
        </div>

        <button
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {(message || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            error
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <section className={cardClass}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <ShieldCheck size={18} className="text-orange-500" />
              SMTP 配置
            </h3>
            <p className="mt-1 text-sm text-neutral-500">用户发送验证码时会使用这里配置的发信服务器。</p>
          </div>
          <button
            onClick={() => void handleSaveConfig()}
            disabled={isSavingConfig}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save size={16} />
            {isSavingConfig ? '保存中...' : '保存配置'}
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 sm:col-span-2">
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
            <label className="flex h-[50px] items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-700">
              <input type="checkbox" checked={clearPassword} onChange={(event) => setClearPassword(event.target.checked)} className="h-4 w-4 accent-red-500" />
              清空现有 SMTP 密码
            </label>
          </div>
          <div>
            <label className={labelClass}>加密方式</label>
            <select value={config.smtpSecurity} onChange={(event) => handleConfigChange('smtpSecurity', event.target.value as SubmissionEmailConfig['smtpSecurity'])} className={inputClass}>
              <option value="none">none</option>
              <option value="starttls">starttls</option>
              <option value="tls">tls</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>认证方式</label>
            <select value={config.smtpAuth} onChange={(event) => handleConfigChange('smtpAuth', event.target.value as SubmissionEmailConfig['smtpAuth'])} className={inputClass}>
              <option value="none">none</option>
              <option value="plain">plain</option>
              <option value="login">login</option>
            </select>
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
            className="inline-flex h-[50px] items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 disabled:opacity-60"
          >
            <Send size={16} />
            {isSendingTest ? '发送中...' : '发送测试邮件'}
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <Mail size={18} className="text-orange-500" />
            邮箱过滤规则
          </h3>
          <p className="mt-1 text-sm text-neutral-500">支持白名单、黑名单、邮箱后缀、精确邮箱和包含匹配。</p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-6">
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
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
            <input type="checkbox" checked={newRule.enabled} onChange={(event) => setNewRule((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4 accent-orange-500" />
            enabled
          </label>
          <input value={newRule.description} onChange={(event) => setNewRule((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} sm:col-span-5`} placeholder="备注，可选" />
          <button
            onClick={() => void handleCreateRule()}
            disabled={isCreatingRule}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-1"
          >
            <Plus size={16} />
            {isCreatingRule ? '创建中...' : '新增规则'}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
              当前还没有邮箱过滤规则。
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-7">
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
                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                  <input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })} className="h-4 w-4 accent-orange-500" />
                  enabled
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleSaveRule(rule)}
                    disabled={savingRuleIds.includes(rule.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Save size={16} />
                    保存
                  </button>
                  <button
                    onClick={() => void handleDeleteRule(rule.id)}
                    disabled={deletingRuleIds.includes(rule.id)}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-red-600 disabled:opacity-60"
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

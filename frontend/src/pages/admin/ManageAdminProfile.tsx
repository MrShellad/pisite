import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Clock, Key, Mail, Save, Shield, ShieldCheck } from 'lucide-react';

import { api } from '../../api/client';
import { useAdminFeedback } from './components/AdminFeedback';

type AdminProfile = {
  email: string;
};

type AdminSecurityConfig = {
  sessionTimeoutMinutes: number;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  hasTurnstileSecret: boolean;
  turnstileSecretPreview?: string | null;
  updatedAt?: string | null;
};

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-neutral-600 dark:focus:bg-blue-500/5';
const iconInputClass = `${inputClass} pl-10`;
const labelClass = 'mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400';
const cardClass =
  'rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';

export default function ManageAdminProfile() {
  const { notify } = useAdminFeedback();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [error, setError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityConfig, setSecurityConfig] = useState<AdminSecurityConfig | null>(null);
  const [turnstileSecretKey, setTurnstileSecretKey] = useState('');
  const [clearTurnstileSecret, setClearTurnstileSecret] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, securityRes] = await Promise.all([
        api.get<AdminProfile>('/admin/profile'),
        api.get<AdminSecurityConfig>('/admin/security'),
      ]);
      setEmail(profileRes.data.email);
      setNewEmail(profileRes.data.email);
      setSecurityConfig(securityRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword !== newPassword2) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (!newEmail.trim()) {
      setError('新邮箱不能为空');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码长度至少需要 6 位');
      return;
    }
    if (!currentPassword) {
      setError('当前密码不能为空');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put<{ token: string }>('/admin/profile', {
        currentPassword,
        newEmail: newEmail.trim(),
        newPassword,
      });
      localStorage.setItem('flowcore_admin_token', res.data.token);
      localStorage.setItem('flowcore_admin_last_activity', String(Date.now()));
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
      notify('账号信息已更新', '登录状态已刷新。', 'success');
      await fetchProfile();
    } catch (err: any) {
      setError(err?.response?.data ?? '更新失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSecurity = async (event: FormEvent) => {
    event.preventDefault();
    if (!securityConfig) return;

    setSavingSecurity(true);
    setError('');
    try {
      const res = await api.put<AdminSecurityConfig>('/admin/security', {
        sessionTimeoutMinutes: Number(securityConfig.sessionTimeoutMinutes) || 30,
        turnstileEnabled: securityConfig.turnstileEnabled,
        turnstileSiteKey: securityConfig.turnstileSiteKey.trim(),
        turnstileSecretKey: turnstileSecretKey.trim() || undefined,
        clearTurnstileSecret,
      });
      setSecurityConfig(res.data);
      setTurnstileSecretKey('');
      setClearTurnstileSecret(false);
      notify('安全配置已保存', '登录验证和会话超时策略已更新。', 'success');
    } catch (err: any) {
      setError(err?.response?.data ?? '安全配置保存失败');
    } finally {
      setSavingSecurity(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-neutral-500">加载中...</div>;
  }

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
          <Shield className="text-blue-500" /> 管理员账号安全
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          管理账号凭据、后台无操作自动注销时间，以及登录页 Cloudflare Turnstile 人机验证。
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className={cardClass}>
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500 dark:text-blue-300">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">账号凭据</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">修改邮箱或密码后会重新签发后台 Token。</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <div className={labelClass}>当前邮箱</div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-2 font-mono text-sm text-neutral-900 dark:border-white/10 dark:bg-black/40 dark:text-white">
                {email}
              </div>
            </div>

            <div>
              <label className={labelClass}>新邮箱</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={newEmail} onChange={event => setNewEmail(event.target.value)} className={iconInputClass} type="email" required />
              </div>
            </div>

            <div>
              <label className={labelClass}>当前密码</label>
              <div className="relative">
                <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={iconInputClass} type="password" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>新密码</label>
                <input value={newPassword} onChange={event => setNewPassword(event.target.value)} className={inputClass} type="password" required />
              </div>
              <div>
                <label className={labelClass}>确认新密码</label>
                <input value={newPassword2} onChange={event => setNewPassword2(event.target.value)} className={inputClass} type="password" required />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 font-black tracking-wide text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black"
            >
              <Save size={18} /> {savingProfile ? '保存中...' : '保存账号信息'}
            </button>
          </form>
        </section>

        <section className={cardClass}>
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">登录安全策略</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Turnstile 启用后，后台登录必须先通过 Cloudflare 验证。</p>
            </div>
          </div>

          {securityConfig ? (
            <form onSubmit={handleSaveSecurity} className="space-y-5">
              <div>
                <label className={labelClass}>无操作自动注销</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={securityConfig.sessionTimeoutMinutes}
                    onChange={event =>
                      setSecurityConfig(current =>
                        current ? { ...current, sessionTimeoutMinutes: Number(event.target.value) } : current,
                      )
                    }
                    className={iconInputClass}
                    type="number"
                    min={5}
                    max={1440}
                    step={5}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">范围 5-1440 分钟。保存后新登录签发的 Token 也会采用该过期时间。</p>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 dark:border-white/10 dark:bg-black/25">
                <span>
                  <span className="block text-sm font-bold text-neutral-900 dark:text-white">启用 Cloudflare Turnstile</span>
                  <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">用于后台登录页的人机验证。</span>
                </span>
                <input
                  type="checkbox"
                  checked={securityConfig.turnstileEnabled}
                  onChange={event =>
                    setSecurityConfig(current =>
                      current ? { ...current, turnstileEnabled: event.target.checked } : current,
                    )
                  }
                  className="h-5 w-5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <div>
                <label className={labelClass}>Site Key</label>
                <input
                  value={securityConfig.turnstileSiteKey}
                  onChange={event =>
                    setSecurityConfig(current =>
                      current ? { ...current, turnstileSiteKey: event.target.value } : current,
                    )
                  }
                  className={inputClass}
                  placeholder="0x4AAAA..."
                />
              </div>

              <div>
                <label className={labelClass}>Secret Key</label>
                <input
                  value={turnstileSecretKey}
                  onChange={event => setTurnstileSecretKey(event.target.value)}
                  className={inputClass}
                  type="password"
                  placeholder={securityConfig.hasTurnstileSecret ? `已保存 ${securityConfig.turnstileSecretPreview ?? ''}` : '尚未保存 Secret Key'}
                />
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">留空会保留已保存的 Secret Key。</p>
              </div>

              {securityConfig.hasTurnstileSecret ? (
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={clearTurnstileSecret}
                    onChange={event => setClearTurnstileSecret(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-red-500 focus:ring-red-500"
                  />
                  保存时清除已保存的 Secret Key
                </label>
              ) : null}

              <button
                type="submit"
                disabled={savingSecurity}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black tracking-wide text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 dark:shadow-none"
              >
                <Save size={18} /> {savingSecurity ? '保存中...' : '保存安全策略'}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}

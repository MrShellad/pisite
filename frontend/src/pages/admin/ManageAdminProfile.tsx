import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Key, Mail, Shield, Save } from 'lucide-react';

type AdminProfile = { email: string };

export default function ManageAdminProfile() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<AdminProfile>('/admin/profile');
      setEmail(res.data.email);
      setNewEmail(res.data.email);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setSaving(true);
    try {
      const res = await api.put<{ token: string }>('/admin/profile', {
        currentPassword,
        newEmail: newEmail.trim(),
        newPassword,
      });
      localStorage.setItem('flowcore_admin_token', res.data.token);
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
      alert('账号信息已更新，请重新登录你的账户状态已刷新。');
      await fetchProfile();
    } catch (err: any) {
      setError(err?.response?.data ?? '更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-2xl">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
        <Shield className="text-blue-500" /> 管理员账号安全
      </h2>

      <div className="p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl backdrop-blur-xl shadow-sm dark:shadow-none">
        {loading ? (
          <div className="animate-pulse text-neutral-500">加载中...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">当前邮箱</div>
              <div className="text-neutral-900 dark:text-white font-mono text-sm bg-neutral-100/60 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2">
                {email}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5">
                  新邮箱
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm"
                    type="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5">
                  当前密码
                </label>
                <div className="relative">
                  <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm"
                    type="password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5">
                  新密码
                </label>
                <div className="relative">
                  <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm"
                    type="password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5">
                  确认新密码
                </label>
                <div className="relative">
                  <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={newPassword2}
                    onChange={e => setNewPassword2(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm"
                    type="password"
                    required
                  />
                </div>
              </div>
            </div>

            {error ? (
              <div className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 py-2 px-4 rounded-xl border border-red-200 dark:border-red-500/20">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-black tracking-wide rounded-2xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} /> {saving ? '保存中...' : '保存账号信息'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


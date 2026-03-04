// frontend/src/pages/admin/Setup.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, ShieldCheck } from 'lucide-react';
import { styleTokens } from '../../lib/design-tokens';
import { api } from '../../api/client';

export default function Setup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // 安全校验：如果已经初始化过了，直接踢回登录页
  useEffect(() => {
    api.get('/auth/check-init').then(res => {
      if (res.data === false) navigate('/admin/login', { replace: true });
    }).catch(console.error);
  }, [navigate]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('两次输入的密码不一致！');
    }
    if (password.length < 6) {
      return setError('密码长度至少需要 6 位！');
    }

    setIsLoading(true);
    try {
      await api.post('/auth/init', { email, password });
      alert('初始化成功！请使用新账号登录。');
      navigate('/admin/login', { replace: true });
    } catch (err: any) {
      setError(err.response?.data || '设置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 ${styleTokens.textPrimary}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-purple-100/30 dark:from-blue-900/10 dark:to-purple-900/10 pointer-events-none"></div>

      <div className={`relative w-full max-w-md p-8 sm:p-10 z-10 ${styleTokens.cardFrosted}`}>
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white drop-shadow-md mb-4">
            <ShieldCheck size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold">欢迎使用 FlowCore</h1>
          <p className={`text-sm mt-2 ${styleTokens.textSecondary}`}>检测到系统为首次运行，请设置超级管理员账号。</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Mail size={18} />
            </div>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${styleTokens.textPrimary}`} placeholder="管理员邮箱" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock size={18} />
            </div>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${styleTokens.textPrimary}`} placeholder="设置密码 (至少 6 位)" />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <Lock size={18} />
            </div>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${styleTokens.textPrimary}`} placeholder="确认密码" />
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

          <button type="submit" disabled={isLoading} className={`w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all shadow-md ${isLoading ? 'opacity-70' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
            {isLoading ? '配置中...' : '完成初始化配置'}
          </button>
        </form>
      </div>
    </div>
  );
}
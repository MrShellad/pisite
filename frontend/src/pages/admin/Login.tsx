// frontend/src/pages/admin/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Lock, Mail } from 'lucide-react';
import { api } from '../../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    api.get('/auth/check-init').then(res => {
      if (res.data === true) navigate('/admin/setup', { replace: true });
    }).catch(console.error);
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('flowcore_admin_token', response.data.token);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data || '登录失败，请检查凭据');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#050505] relative overflow-hidden font-sans transition-colors duration-500">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative w-full max-w-sm p-8 z-10 bg-white/80 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl transition-colors duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] mb-5">
            <Zap size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide">FlowCore 控制台</h1>
          <p className="text-sm text-neutral-500 mt-2">身份验证以访问管理终端</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-blue-500 transition-colors">
              <Mail size={18} />
            </div>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all" placeholder="Admin E-Mail" />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-blue-500 transition-colors">
              <Lock size={18} />
            </div>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all" placeholder="Password" />
          </div>
          
          {error && <div className="text-red-500 dark:text-red-400 text-sm mt-2 text-center bg-red-50 dark:bg-red-500/10 py-2 rounded-lg border border-red-200 dark:border-red-500/20">{error}</div>}

          <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 shadow-lg dark:shadow-none">
            {isLoading ? '验证中...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
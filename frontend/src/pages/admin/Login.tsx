import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, Zap } from 'lucide-react';

import { api } from '../../api/client';
import { AdminThemeToggle } from './components/AdminThemeToggle';

type AdminLoginSecurityConfig = {
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityConfig, setSecurityConfig] = useState<AdminLoginSecurityConfig | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin';
  const timeoutMessage = location.state?.reason === 'timeout' ? '登录已超时，请重新验证身份。' : '';

  useEffect(() => {
    api
      .get('/auth/check-init')
      .then(res => {
        if (res.data === true) navigate('/admin/setup', { replace: true });
      })
      .catch(console.error);
  }, [navigate]);

  useEffect(() => {
    api
      .get<AdminLoginSecurityConfig>('/auth/admin-security')
      .then(res => setSecurityConfig(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!securityConfig?.turnstileEnabled || !securityConfig.turnstileSiteKey || !turnstileContainerRef.current) {
      return;
    }

    let cancelled = false;
    const renderTurnstile = () => {
      if (cancelled || !window.turnstile || !turnstileContainerRef.current || turnstileWidgetRef.current) return;
      turnstileWidgetRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: securityConfig.turnstileSiteKey,
        callback: token => {
          setTurnstileToken(token);
          setError('');
        },
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    };

    if (window.turnstile) {
      renderTurnstile();
    } else {
      const existingScript = document.getElementById('cloudflare-turnstile-script') as HTMLScriptElement | null;
      const script = existingScript ?? document.createElement('script');
      if (!existingScript) {
        script.id = 'cloudflare-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderTurnstile);
      return () => {
        cancelled = true;
        script.removeEventListener('load', renderTurnstile);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [securityConfig]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (securityConfig?.turnstileEnabled && !turnstileToken) {
      setError('请先完成人机验证');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password, turnstileToken });
      localStorage.setItem('flowcore_admin_token', response.data.token);
      localStorage.setItem('flowcore_admin_last_activity', String(Date.now()));
      navigate(from, { replace: true });
    } catch (err: any) {
      setTurnstileToken('');
      if (turnstileWidgetRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetRef.current);
      }
      setError(err.response?.data || '登录失败，请检查凭据');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 font-sans transition-colors duration-500 dark:bg-[#050505]">
      <AdminThemeToggle className="absolute right-5 top-5 z-20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[150px] dark:bg-blue-600/20" />

      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-neutral-200 bg-white/80 p-8 shadow-2xl backdrop-blur-2xl transition-colors duration-500 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]">
            <Zap size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">FlowCore 控制台</h1>
          <p className="mt-2 text-sm text-neutral-500">身份验证以访问管理终端</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 transition-colors group-focus-within:text-blue-500">
              <Mail size={18} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-100/50 py-3.5 pl-11 pr-4 text-neutral-900 placeholder-neutral-400 transition-all focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-neutral-600 dark:focus:bg-blue-500/5"
              placeholder="Admin E-Mail"
            />
          </div>

          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 transition-colors group-focus-within:text-blue-500">
              <Lock size={18} />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-100/50 py-3.5 pl-11 pr-4 text-neutral-900 placeholder-neutral-400 transition-all focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-neutral-600 dark:focus:bg-blue-500/5"
              placeholder="Password"
            />
          </div>

          {securityConfig?.turnstileEnabled ? (
            securityConfig.turnstileSiteKey ? (
              <div className="flex min-h-[70px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50/70 p-2 dark:border-white/10 dark:bg-black/30">
                <div ref={turnstileContainerRef} />
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                Cloudflare 人机验证已启用，但 Site Key 尚未配置。
              </div>
            )
          ) : null}

          {(error || timeoutMessage) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 py-2 text-center text-sm text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {error || timeoutMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full rounded-xl bg-neutral-900 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black dark:shadow-none dark:hover:bg-neutral-200"
          >
            {isLoading ? '验证中...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

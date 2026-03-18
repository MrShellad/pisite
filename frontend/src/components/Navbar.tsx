import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import { api } from '../api/client';
import { styleTokens } from '../lib/design-tokens';

const navItems = [
  { label: '核心特性', href: '#features' },
  { label: '常见问题', href: '#faq' },
  { label: '更新日志', href: '#changelog' },
  { label: '赞助商', href: '#sponsors' },
];

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [siteName, setSiteName] = useState('加载中...');

  useEffect(() => {
    api
      .get('/settings')
      .then((response) => {
        if (response.data?.siteName) {
          setSiteName(response.data.siteName);
        }
      })
      .catch(() => setSiteName('FlowCore'));

    const savedTheme = localStorage.getItem('flowcore_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
      return;
    }

    document.documentElement.classList.remove('dark');
    setIsDark(false);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('flowcore_theme', 'light');
      setIsDark(false);
      return;
    }

    document.documentElement.classList.add('dark');
    localStorage.setItem('flowcore_theme', 'dark');
    setIsDark(true);
  };

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);

    if (!element) {
      return;
    }

    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - 100;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  };

  return (
    <nav className={styleTokens.navbarFrosted}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <motion.div
          className="flex w-48 cursor-pointer items-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="回到顶部"
        >
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-orange-500 p-2.5 text-white drop-shadow-sm">
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <span className={`text-xl font-bold tracking-tight ${styleTokens.textPrimary}`}>
            {siteName}
          </span>
        </motion.div>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(event) => scrollToSection(event, item.href)}
              className="text-sm font-medium text-neutral-500 transition-colors duration-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/servers/submit"
            className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100"
          >
            提交服务器
          </Link>
        </div>

        <div className="flex w-auto items-center justify-end gap-3 sm:w-48">
          <Link
            to="/servers/submit"
            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 md:hidden"
          >
            提交
          </Link>
          <button
            onClick={toggleTheme}
            className={`rounded-full bg-neutral-100 p-2.5 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 ${styleTokens.focusRing}`}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

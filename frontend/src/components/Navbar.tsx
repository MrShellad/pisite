// frontend/src/components/Navbar.tsx
import { useState, useEffect } from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { styleTokens } from '../lib/design-tokens';
import { api } from '../api/client';

// 定义导航锚点
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
    api.get('/settings')
      .then(res => { if (res.data && res.data.siteName) setSiteName(res.data.siteName); })
      .catch(() => setSiteName('FlowCore'));

    const savedTheme = localStorage.getItem('flowcore_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('flowcore_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('flowcore_theme', 'dark');
      setIsDark(true);
    }
  };

  // 智能平滑滚动函数 (带高度偏移，防止导航栏遮挡标题)
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const elem = document.getElementById(targetId);
    
    if (elem) {
      // 获取元素距离顶部的绝对位置
      const elementPosition = elem.getBoundingClientRect().top + window.scrollY;
      // 减去导航栏的高度和额外的 Padding (大约 100px)
      const offsetPosition = elementPosition - 100;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    // navbarFrosted 在 design-tokens.ts 中已经包含了 sticky top-0 z-50 属性
    <nav className={styleTokens.navbarFrosted}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* 左侧：应用 Logo & 名称 */}
        <motion.div 
          className="flex items-center gap-2.5 cursor-pointer w-48" // 固定宽度保持居中平衡
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="回到顶部"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white drop-shadow-sm">
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <span className={`text-xl font-bold tracking-tight ${styleTokens.textPrimary}`}>
            {siteName}
          </span>
        </motion.div>

        {/* 中间：锚点导航 (PC端显示，移动端隐藏) */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => scrollToSection(e, item.href)}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors duration-300"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* 右侧：主题切换按钮与预留空间 */}
        <div className="flex items-center justify-end w-48 gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-full transition-colors bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 ${styleTokens.focusRing}`}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

      </div>
    </nav>
  );
}
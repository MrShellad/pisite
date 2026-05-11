import { Moon, Sun } from 'lucide-react';

import { useAdminTheme } from '../hooks/useAdminTheme';

type AdminThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function AdminThemeToggle({ className = '', showLabel = true }: AdminThemeToggleProps) {
  const { isDark, toggleTheme } = useAdminTheme();
  const label = isDark ? '浅色模式' : '暗色模式';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`切换到${label}`}
      title={`切换到${label}`}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:shadow-none dark:hover:border-orange-400 dark:hover:text-orange-300 ${className}`}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      {showLabel ? <span className="hidden sm:inline">{label}</span> : null}
    </button>
  );
}

import { useEffect, useState } from 'react';

const THEME_STORAGE_KEY = 'flowcore_theme';

type ThemeMode = 'light' | 'dark';

function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getPreferredTheme());
  const isDark = theme === 'dark';

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState(current => (current === 'dark' ? 'light' : 'dark'));
  };

  return {
    isDark,
    setTheme,
    theme,
    toggleTheme,
  };
}

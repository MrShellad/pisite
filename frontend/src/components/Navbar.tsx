import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import { api } from '../api/client';
import { styleTokens } from '../lib/design-tokens';
import { useHomeLocale, type HomeLocale } from '../lib/home-i18n';
import type { HeroFormData } from '../pages/admin/types/hero';

interface BrandingState {
  logoUrl: string;
  logoColor: string;
}

export default function Navbar() {
  const location = useLocation();
  const { copy, locale, setLocale } = useHomeLocale();
  const [isDark, setIsDark] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [branding, setBranding] = useState<BrandingState>({
    logoUrl: '',
    logoColor: '#4ade80',
  });

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([api.get('/settings'), api.get<HeroFormData>('/hero')]).then(results => {
      if (!isMounted) {
        return;
      }

      const [settingsResult, heroResult] = results;

      if (settingsResult.status === 'fulfilled' && settingsResult.value.data?.siteName) {
        setSiteName(settingsResult.value.data.siteName);
      } else {
        setSiteName('FlowCore');
      }

      if (heroResult.status === 'fulfilled') {
        setBranding({
          logoUrl: heroResult.value.data.logoUrl || '',
          logoColor: heroResult.value.data.logoColor || '#4ade80',
        });
      }
    });

    const savedTheme = localStorage.getItem('flowcore_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
      return () => {
        isMounted = false;
      };
    }

    document.documentElement.classList.remove('dark');
    setIsDark(false);

    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = useMemo(
    () => [
      { label: copy.nav.features, href: '#features' },
      { label: copy.nav.faq, href: '#faq' },
      { label: copy.nav.changelog, href: '#changelog' },
      { label: copy.nav.sponsors, href: '#sponsors' },
    ],
    [copy],
  );

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

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (location.pathname !== '/') {
      return;
    }

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

  const switchLocale = (nextLocale: HomeLocale) => {
    if (nextLocale !== locale) {
      setLocale(nextLocale);
    }
  };

  return (
    <nav className={styleTokens.navbarFrosted}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <motion.button
          type="button"
          className="flex w-48 items-center gap-3 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title={copy.nav.backToTop}
        >
          <div
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-white/5"
            style={{ boxShadow: `0 0 18px ${branding.logoColor}26` }}
          >
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={siteName || 'FlowCore'}
                className="h-8 w-8 object-contain"
                style={{ filter: `drop-shadow(0 0 8px ${branding.logoColor})` }}
              />
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-500 p-2 text-white">
                <Zap size={20} strokeWidth={2.5} />
              </div>
            )}
          </div>
          <span className={`text-xl font-bold tracking-tight ${styleTokens.textPrimary}`}>
            {siteName || copy.nav.loadingSiteName}
          </span>
        </motion.button>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map(item => (
            <a
              key={item.href}
              href={location.pathname === '/' ? item.href : `/${item.href}`}
              onClick={event => scrollToSection(event, item.href)}
              className="text-sm font-medium text-neutral-500 transition-colors duration-300 hover:text-emerald-700 dark:text-neutral-400 dark:hover:text-emerald-300"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/servers/submit"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
          >
            {copy.nav.serverSubmit}
          </Link>
        </div>

        <div className="flex w-auto items-center justify-end gap-3 sm:w-48">
          <div className="hidden items-center rounded-full border border-neutral-200 bg-white/80 p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 sm:flex">
            <button
              type="button"
              onClick={() => switchLocale('zh-CN')}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                locale === 'zh-CN'
                  ? 'bg-emerald-500 text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {copy.common.zhLabel}
            </button>
            <button
              type="button"
              onClick={() => switchLocale('en')}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                locale === 'en'
                  ? 'bg-emerald-500 text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {copy.common.enLabel}
            </button>
          </div>
          <Link
            to="/servers/submit"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20 md:hidden"
          >
            {copy.nav.serverSubmitShort}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-full bg-neutral-100 p-2.5 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 ${styleTokens.focusRing}`}
            title={isDark ? copy.nav.switchToLight : copy.nav.switchToDark}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

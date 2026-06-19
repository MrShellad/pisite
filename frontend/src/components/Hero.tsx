import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown } from 'lucide-react';

import { api } from '../api/client';
import { getHomeBootstrap, readCachedHomeBootstrap } from '../lib/home-bootstrap';
import {
  buttonShineSweep,
  heroFadeDown,
  logoEntry,
  staggerContainer,
  styleTokens,
} from '../lib/design-tokens';
import { useHomeLocale } from '../lib/home-i18n';
import type { HeroFormData } from '../pages/admin/types/hero';

interface HeroProps {
  previewConfig?: HeroFormData;
}

interface OsInfo {
  name: string;
  svg: string;
  url: string;
}

interface ChangelogPlatforms {
  darwin?: { url?: string };
  windows?: { url?: string };
  linux?: { url?: string };
}

const defaultOsInfo: OsInfo = { name: 'Windows', svg: '', url: '' };

function detectOsName(): 'macOS' | 'Linux' | 'Windows' {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Windows';
}

const OS_SVGS: Record<string, string> = {
  macOS:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z"/></svg>',
  Windows:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5L10 4.5V11H3V5.5ZM11 4.3L21 3V11H11V4.3ZM3 12H10V18.5L3 17.5V12ZM11 12H21V19.7L11 18.2V12Z"/></svg>',
  Linux:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5c-2.2 0-3.8 1.9-3.8 4.3 0 1.1.3 2 .8 2.7-.9.4-1.5 1.1-1.7 2-.5 2-1.1 4.8-.7 6.4.4 1.5 1.9 3.1 3.3 3.1.8 0 1.3-.5 1.6-1.1l.6-1.2.6 1.2c.3.6.8 1.1 1.6 1.1 1.4 0 2.9-1.6 3.3-3.1.4-1.6-.2-4.4-.7-6.4-.2-.9-.8-1.6-1.7-2 .5-.7.8-1.6.8-2.7 0-2.4-1.6-4.3-3.8-4.3Zm-1.8 5.1c.4 0 .8.4.8.8 0 .5-.4.9-.8.9s-.8-.4-.8-.9c0-.4.4-.8.8-.8Zm3.6 0c.4 0 .8.4.8.8 0 .5-.4.9-.8.9s-.8-.4-.8-.9c0-.4.4-.8.8-.8Z"/></svg>',
};

function resolveOsInfo(config: HeroFormData, changelogPlatforms?: ChangelogPlatforms | null): OsInfo {
  const osName = detectOsName();
  const svg = OS_SVGS[osName] ?? OS_SVGS.Windows;

  let url = '';
  if (osName === 'macOS') {
    url = config.dlMac || changelogPlatforms?.darwin?.url || '';
  } else if (osName === 'Linux') {
    url = config.dlLinux || changelogPlatforms?.linux?.url || '';
  } else {
    url = config.dlWin || changelogPlatforms?.windows?.url || '';
  }

  return { name: osName, svg, url };
}

export default function Hero({ previewConfig }: HeroProps) {
  const { copy, locale } = useHomeLocale();
  const cachedBootstrap = previewConfig ? null : readCachedHomeBootstrap();
  const [config, setConfig] = useState<HeroFormData | null>(previewConfig ?? cachedBootstrap?.hero ?? null);
  const [latestPlatforms, setLatestPlatforms] = useState<ChangelogPlatforms | null>(
    cachedBootstrap?.latestRelease?.platforms ?? null,
  );
  const [osInfo, setOsInfo] = useState<OsInfo>(defaultOsInfo);
  const [latestVersion, setLatestVersion] = useState<string | null>(
    cachedBootstrap?.latestRelease?.version ?? null,
  );
  const [latestDate, setLatestDate] = useState<string | null>(cachedBootstrap?.latestRelease?.date ?? null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const platforms = config
    ? [
        {
          key: 'Windows',
          label: 'Windows',
          url: config.dlWin || latestPlatforms?.windows?.url || '',
          svg: OS_SVGS.Windows,
        },
        {
          key: 'macOS',
          label: 'macOS',
          url: config.dlMac || latestPlatforms?.darwin?.url || '',
          svg: OS_SVGS.macOS,
        },
        {
          key: 'Linux',
          label: 'Linux',
          url: config.dlLinux || latestPlatforms?.linux?.url || '',
          svg: OS_SVGS.Linux,
        },
      ]
    : [];

  const hasDownload = osInfo.url.length > 0;
  const steamDeckSourceUrl = (config?.steamDeckSourceUrl || '').trim();
  const showSteamDeckSource = osInfo.name === 'Linux' && steamDeckSourceUrl.length > 0;

  const trackDownload = (platform: string) => {
    let fingerprint = localStorage.getItem('flowcore_browser_id');
    if (!fingerprint) {
      fingerprint = crypto.randomUUID();
      localStorage.setItem('flowcore_browser_id', fingerprint);
    }

    api
      .post('/track/download', {
        platform,
        fingerprint,
      })
      .catch(console.error);
  };

  const handleDownloadClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!hasDownload) return;

    trackDownload(osInfo.name);
    window.location.href = osInfo.url;
  };

  const handleSteamDeckSourceClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!showSteamDeckSource) return;

    trackDownload('SteamDeckSource');
    window.location.href = steamDeckSourceUrl;
  };

  useEffect(() => {
    if (previewConfig) {
      setConfig(previewConfig);
      return;
    }

    getHomeBootstrap()
      .then(data => {
        setConfig(data.hero);
        setLatestPlatforms(data.latestRelease?.platforms ?? null);
        setLatestVersion(data.latestRelease?.version ?? null);
        setLatestDate(data.latestRelease?.date ?? null);
      })
      .catch(console.error);
  }, [previewConfig]);

  useEffect(() => {
    if (!config) return;
    setOsInfo(resolveOsInfo(config, previewConfig ? null : latestPlatforms));
  }, [config, latestPlatforms, previewConfig]);

  if (!config) {
    return (
      <section className="relative min-h-[560px] overflow-hidden pb-20 pt-16 md:min-h-[720px] md:pb-40 md:pt-28" aria-busy="true">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-400/20 blur-[128px] dark:bg-emerald-500/10" />
          <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-lime-400/20 blur-[128px] dark:bg-lime-500/10" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-5xl animate-pulse flex-col items-center px-4 text-center sm:px-6">
          <div className="mb-8 h-16 w-16 rounded-3xl bg-white/70 shadow-sm dark:bg-white/10 md:h-24 md:w-24" />
          <div className="mb-5 h-12 w-full max-w-[620px] rounded-3xl bg-white/70 dark:bg-white/10 md:mb-6 md:h-20" />
          <div className="mb-10 h-16 w-full max-w-2xl rounded-2xl bg-white/55 dark:bg-white/5 md:mb-12" />
          <div className="h-14 w-full max-w-xs rounded-full bg-emerald-500/20 dark:bg-emerald-400/10" />
        </div>
      </section>
    );
  }

  const displayDate = latestDate || config.updateDate;
  const localizedTitle = locale === 'en' && config.titleEn.trim() ? config.titleEn : config.title;
  const localizedSubtitle = locale === 'en' && config.subtitleEn.trim() ? config.subtitleEn : config.subtitle;
  const localizedDescription =
    locale === 'en' && config.descriptionEn.trim() ? config.descriptionEn : config.description;
  const localizedButtonText =
    locale === 'en' && config.buttonTextEn.trim() ? config.buttonTextEn : config.buttonText;
  const normalizedDescription = (localizedDescription || '').replace(/\r\n?/g, '\n');

  return (
    <section className="relative overflow-hidden pb-20 pt-16 md:pb-40 md:pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={logoEntry}
          className="relative mb-8 transition-transform hover:scale-105"
          style={{ color: config.logoColor }}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="h-44 w-44 rounded-full blur-3xl md:h-64 md:w-64"
              style={{
                background: `radial-gradient(circle, ${config.logoColor}66 0%, ${config.logoColor}2e 42%, transparent 74%)`,
              }}
              animate={{ opacity: [0.45, 0.82, 0.45], scale: [0.92, 1.18, 0.92] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="relative z-10 flex h-16 w-16 items-center justify-center md:h-24 md:w-24">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Hero Logo"
                width={96}
                height={96}
                decoding="async"
                fetchPriority="high"
                className="h-full w-full object-contain [filter:drop-shadow(0_18px_28px_rgba(15,23,42,0.16))] dark:[filter:drop-shadow(0_18px_34px_rgba(0,0,0,0.5))]"
              />
            ) : null}
          </div>
        </motion.div>

        <motion.h1
          variants={heroFadeDown}
          className="mb-5 text-4xl font-extrabold leading-[1.2] tracking-tighter text-neutral-900 dark:text-white sm:text-5xl md:mb-6 md:text-7xl md:leading-[1.15]"
        >
          {localizedTitle}
          <span className="mt-1 block bg-gradient-to-r from-emerald-500 to-lime-500 bg-clip-text text-transparent md:mt-2">
            {localizedSubtitle}
          </span>
        </motion.h1>

        <motion.p
          variants={heroFadeDown}
          className={`mb-10 max-w-2xl whitespace-pre-line text-base leading-relaxed sm:text-lg md:mb-12 md:text-xl ${styleTokens.textSecondary}`}
        >
          {normalizedDescription}
        </motion.p>

        <motion.div variants={heroFadeDown} className="flex w-full flex-col items-center sm:w-auto">
          <div className="relative w-full sm:w-auto flex flex-col items-center">
            {hasDownload ? (
              <motion.a
                href={osInfo.url}
                onClick={handleDownloadClick}
                className={styleTokens.btnDownloadFrosted}
                whileHover="hover"
              >
                <Download className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                <span className="font-bold">{localizedButtonText}</span>

                <motion.span
                  className="pointer-events-none absolute top-0 h-full w-32 -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/60 to-transparent blur-md"
                  variants={buttonShineSweep}
                  initial="hidden"
                />
              </motion.a>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100/80 px-8 py-3.5 text-sm font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-400">
                <Download className="h-5 w-5 opacity-40" />
                <span>{copy.hero.downloadUnavailable}</span>
              </div>
            )}

            {/* 下载其它平台选项 */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="mt-3 text-xs sm:text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors flex items-center gap-1 focus-visible:outline-none"
            >
              <span>{copy.hero.downloadForOtherPlatforms}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 其它平台下拉菜单 */}
            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -ml-36 mt-2 z-50 w-72 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl p-2.5 shadow-xl flex flex-col gap-1"
                  >
                    {platforms.map((p) => {
                      const isCurrent = p.key === osInfo.name;
                      const hasUrl = p.url.length > 0;

                      return (
                        <a
                          key={p.key}
                          href={hasUrl ? p.url : undefined}
                          onClick={(e) => {
                            if (!hasUrl) {
                              e.preventDefault();
                              return;
                            }
                            trackDownload(p.key);
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
                            hasUrl
                              ? 'hover:bg-neutral-100 dark:hover:bg-neutral-900/60 cursor-pointer text-neutral-800 dark:text-neutral-200'
                              : 'opacity-40 cursor-not-allowed text-neutral-400'
                          } ${
                            isCurrent
                              ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20'
                              : 'border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-4.5 w-4.5 text-neutral-600 dark:text-neutral-400 flex items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                              dangerouslySetInnerHTML={{ __html: p.svg }}
                            />
                            <span className="font-semibold text-sm">{p.label}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                {copy.hero.detected}
                              </span>
                            )}
                          </div>
                          {hasUrl ? (
                            <Download className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors" />
                          ) : (
                            <span className="text-[10px] opacity-70">{copy.hero.downloadUnavailable}</span>
                          )}
                        </a>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {showSteamDeckSource ? (
            <motion.a
              href={steamDeckSourceUrl}
              onClick={handleSteamDeckSourceClick}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-white/70 px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm backdrop-blur-sm transition-colors hover:border-emerald-500/60 hover:bg-emerald-50 dark:border-emerald-400/30 dark:bg-neutral-900/70 dark:text-emerald-100 dark:hover:bg-emerald-500/10 sm:w-auto sm:text-base"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Download className="h-4 w-4" strokeWidth={2.5} />
              <span>{copy.hero.steamDeckSourceButton}</span>
            </motion.a>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-full border border-neutral-200 bg-neutral-100/80 px-5 py-2 text-xs text-neutral-600 shadow-sm backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-400 sm:text-sm">
            <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
              <div className="h-4 w-4" dangerouslySetInnerHTML={{ __html: osInfo.svg }} />
              <span>{copy.hero.forPlatform(osInfo.name)}</span>
            </div>
            <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            {latestVersion ? (
              <>
                <span className="font-mono font-medium">{latestVersion}</span>
                <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              </>
            ) : null}
            <span>
              {copy.hero.lastUpdate} <span className="font-mono">{displayDate}</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

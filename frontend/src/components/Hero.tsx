import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

import { api } from '../api/client';
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
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10a7.9 7.9 0 0 0 1.5 4.6l5.3 6.9c.3.4.9.4 1.2 0l5.3-6.9A7.9 7.9 0 0 0 20 10c0-4.42-3.58-8-8-8zm0 11.5A3.5 3.5 0 1 1 15.5 10a3.5 3.5 0 0 1-3.5 3.5z"/></svg>',
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

function hasHtmlMarkup(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

export default function Hero({ previewConfig }: HeroProps) {
  const { copy } = useHomeLocale();
  const [config, setConfig] = useState<HeroFormData | null>(previewConfig ?? null);
  const [latestPlatforms, setLatestPlatforms] = useState<ChangelogPlatforms | null>(null);
  const [osInfo, setOsInfo] = useState<OsInfo>(defaultOsInfo);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);

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

    api
      .get<HeroFormData>('/hero')
      .then(response => setConfig(response.data))
      .catch(console.error);
  }, [previewConfig]);

  useEffect(() => {
    if (previewConfig) return;

    api
      .get('/changelog')
      .then(response => {
        const logs = response.data as Array<{
          isLatest?: boolean;
          version?: string;
          date?: string;
          platforms?: ChangelogPlatforms;
        }>;
        const latest = logs.find(log => log.isLatest);
        if (latest) {
          setLatestPlatforms(latest.platforms ?? null);
          setLatestVersion(latest.version ?? null);
          setLatestDate(latest.date ?? null);
        }
      })
      .catch(console.error);
  }, [previewConfig]);

  useEffect(() => {
    if (!config) return;
    setOsInfo(resolveOsInfo(config, previewConfig ? null : latestPlatforms));
  }, [config, latestPlatforms, previewConfig]);

  if (!config) {
    return null;
  }

  const displayDate = latestDate || config.updateDate;
  const normalizedDescription = (config.description || '').replace(/\r\n?/g, '\n');
  const useHtmlDescription = hasHtmlMarkup(normalizedDescription);

  return (
    <section className="relative overflow-hidden pb-20 pt-16 md:pb-40 md:pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-400/20 blur-[128px] dark:bg-emerald-500/10" />
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-lime-400/20 blur-[128px] dark:bg-lime-500/10" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={logoEntry}
          className="mb-8 transition-transform hover:scale-105"
          style={{ color: config.logoColor }}
        >
          <div className="flex h-16 w-16 items-center justify-center md:h-24 md:w-24">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Hero Logo"
                className="h-full w-full object-contain drop-shadow-[0_0_12px_currentColor]"
              />
            ) : null}
          </div>
        </motion.div>

        <motion.h1
          variants={heroFadeDown}
          className="mb-5 text-4xl font-extrabold leading-[1.2] tracking-tighter text-neutral-900 dark:text-white sm:text-5xl md:mb-6 md:text-7xl md:leading-[1.15]"
        >
          {config.title}
          <span className="mt-1 block bg-gradient-to-r from-emerald-500 to-lime-500 bg-clip-text text-transparent md:mt-2">
            {config.subtitle}
          </span>
        </motion.h1>

        {useHtmlDescription ? (
          <motion.div
            variants={heroFadeDown}
            className={`mb-10 max-w-2xl text-base leading-relaxed sm:text-lg md:mb-12 md:text-xl ${styleTokens.textSecondary}`}
            dangerouslySetInnerHTML={{ __html: normalizedDescription.replace(/\n/g, '<br />') }}
          />
        ) : (
          <motion.p
            variants={heroFadeDown}
            className={`mb-10 max-w-2xl whitespace-pre-line text-base leading-relaxed sm:text-lg md:mb-12 md:text-xl ${styleTokens.textSecondary}`}
          >
            {normalizedDescription}
          </motion.p>
        )}

        <motion.div variants={heroFadeDown} className="flex w-full flex-col items-center sm:w-auto">
          {hasDownload ? (
            <motion.a
              href={osInfo.url}
              onClick={handleDownloadClick}
              className={styleTokens.btnDownloadFrosted}
              whileHover="hover"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
              <span className="font-bold">{config.buttonText}</span>

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

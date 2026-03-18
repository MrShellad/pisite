import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Download } from 'lucide-react';
import { motion } from 'framer-motion';

import { api } from '../api/client';
import {
  buttonShineSweep,
  heroFadeDown,
  logoEntry,
  staggerContainer,
  styleTokens,
} from '../lib/design-tokens';
import type { HeroFormData } from '../pages/admin/types/hero';

interface HeroProps {
  previewConfig?: HeroFormData;
}

interface OsInfo {
  name: string;
  svg: string;
  url: string;
}

const defaultOsInfo: OsInfo = { name: 'Windows', svg: '', url: '#' };

function resolveOsInfo(config: HeroFormData): OsInfo {
  const ua = window.navigator.userAgent.toLowerCase();

  if (ua.includes('mac')) {
    return {
      name: 'macOS',
      url: config.dlMac,
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10a7.9 7.9 0 0 0 1.5 4.6l5.3 6.9c.3.4.9.4 1.2 0l5.3-6.9A7.9 7.9 0 0 0 20 10c0-4.42-3.58-8-8-8zm0 11.5A3.5 3.5 0 1 1 15.5 10a3.5 3.5 0 0 1-3.5 3.5z"/></svg>',
    };
  }

  if (ua.includes('linux')) {
    return {
      name: 'Linux',
      url: config.dlLinux,
      svg: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 5.5L10 4.5V11H3V5.5ZM11 4.3L21 3V11H11V4.3ZM3 12H10V18.5L3 17.5V12ZM11 12H21V19.7L11 18.2V12Z"/></svg>',
    };
  }

  return {
    name: 'Windows',
    url: config.dlWin,
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5L10 4.5V11H3V5.5ZM11 4.3L21 3V11H11V4.3ZM3 12H10V18.5L3 17.5V12ZM11 12H21V19.7L11 18.2V12Z"/></svg>',
  };
}

export default function Hero({ previewConfig }: HeroProps) {
  const [config, setConfig] = useState<HeroFormData | null>(previewConfig ?? null);
  const [osInfo, setOsInfo] = useState<OsInfo>(
    previewConfig ? resolveOsInfo(previewConfig) : defaultOsInfo,
  );

  const handleDownloadClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    let fingerprint = localStorage.getItem('flowcore_browser_id');
    if (!fingerprint) {
      fingerprint = crypto.randomUUID();
      localStorage.setItem('flowcore_browser_id', fingerprint);
    }

    api
      .post('/track/download', {
        platform: osInfo.name,
        fingerprint,
      })
      .catch(console.error);

    window.location.href = osInfo.url;
  };

  useEffect(() => {
    if (previewConfig) {
      setConfig(previewConfig);
      setOsInfo(resolveOsInfo(previewConfig));
      return;
    }

    api
      .get<HeroFormData>('/hero')
      .then((response) => {
        setConfig(response.data);
        setOsInfo(resolveOsInfo(response.data));
      })
      .catch(console.error);
  }, [previewConfig]);

  if (!config) {
    return null;
  }

  return (
    <section className="relative overflow-hidden pb-20 pt-16 md:pb-40 md:pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-400/20 blur-[128px] dark:bg-blue-600/10" />
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-[128px] dark:bg-indigo-600/10" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={logoEntry}
          className="mb-8 rounded-[2rem] p-6 shadow-2xl transition-transform hover:scale-105 md:p-8"
          style={{
            backgroundColor: '#1C1C1E',
            color: config.logoColor,
            boxShadow: `0 10px 40px ${config.logoColor}33`,
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center md:h-16 md:w-16">
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
          className="mb-5 text-4xl font-extrabold leading-[1.2] tracking-tighter sm:text-5xl md:mb-6 md:text-7xl md:leading-[1.15]"
        >
          {config.title}
          <span className="mt-1 block bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent md:mt-2">
            {config.subtitle}
          </span>
        </motion.h1>

        <motion.p
          variants={heroFadeDown}
          className={`mb-10 max-w-2xl text-base leading-relaxed sm:text-lg md:mb-12 md:text-xl ${styleTokens.textSecondary}`}
          dangerouslySetInnerHTML={{ __html: config.description }}
        />

        <motion.div variants={heroFadeDown} className="flex w-full flex-col items-center sm:w-auto">
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

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-full border border-neutral-200 bg-neutral-100/80 px-5 py-2 text-xs text-neutral-600 shadow-sm backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-400 sm:text-sm">
            <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
              <div className="h-4 w-4" dangerouslySetInnerHTML={{ __html: osInfo.svg }} />
              <span>For {osInfo.name}</span>
            </div>
            <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <span>
              最后更新 <span className="font-mono">{config.updateDate}</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

import { useEffect } from 'react';

import { getHomeBootstrap, readCachedHomeBootstrap } from '../../../lib/home-bootstrap';
import type { SiteSettings } from '../types/settings';

const cachedSeoKey = 'flowcore_cached_seo';

type CachedSeo = {
  title?: string;
  description?: string;
  keywords?: string;
};

function applySeo(data: CachedSeo) {
  if (data.title) {
    document.title = data.title;
  }

  if (data.description) {
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', data.description);
  }

  if (data.keywords) {
    let keyMeta = document.querySelector('meta[name="keywords"]');
    if (!keyMeta) {
      keyMeta = document.createElement('meta');
      keyMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keyMeta);
    }
    keyMeta.setAttribute('content', data.keywords);
  }
}

function settingsToSeo(settings: SiteSettings): CachedSeo {
  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
    keywords: settings.seoKeywords,
  };
}

function readCachedSeo(): CachedSeo | null {
  try {
    const cached = localStorage.getItem(cachedSeoKey);
    return cached ? (JSON.parse(cached) as CachedSeo) : null;
  } catch {
    return null;
  }
}

export function useDynamicSEO() {
  useEffect(() => {
    const cachedSettings = readCachedHomeBootstrap()?.settings;
    const cached = cachedSettings ? settingsToSeo(cachedSettings) : readCachedSeo();
    if (cached) {
      applySeo(cached);
    }

    getHomeBootstrap()
      .then(({ settings: data }) => {
        if (!data) return;

        const nextSeo = settingsToSeo(data);
        applySeo(nextSeo);
        localStorage.setItem(cachedSeoKey, JSON.stringify(nextSeo));
      })
      .catch(console.error);
  }, []);
}

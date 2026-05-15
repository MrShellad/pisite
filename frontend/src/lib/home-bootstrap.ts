import { api } from '../api/client';
import type { HeroFormData } from '../pages/admin/types/hero';
import type { SiteSettings } from '../pages/admin/types/settings';

export interface HomeLatestRelease {
  version: string;
  date: string;
  platforms?: {
    darwin?: { url?: string };
    windows?: { url?: string };
    linux?: { url?: string };
  };
}

export interface HomeBootstrap {
  settings: SiteSettings;
  hero: HeroFormData;
  latestRelease?: HomeLatestRelease | null;
}

const cachedHomeBootstrapKey = 'flowcore_cached_home_bootstrap';

let bootstrapPromise: Promise<HomeBootstrap> | null = null;

export function readCachedHomeBootstrap(): HomeBootstrap | null {
  try {
    const cached = localStorage.getItem(cachedHomeBootstrapKey);
    return cached ? (JSON.parse(cached) as HomeBootstrap) : null;
  } catch {
    return null;
  }
}

export function getHomeBootstrap(): Promise<HomeBootstrap> {
  if (!bootstrapPromise) {
    bootstrapPromise = api
      .get<HomeBootstrap>('/home/bootstrap')
      .then(response => {
        localStorage.setItem(cachedHomeBootstrapKey, JSON.stringify(response.data));
        return response.data;
      })
      .catch(error => {
        bootstrapPromise = null;
        throw error;
      });
  }

  return bootstrapPromise;
}

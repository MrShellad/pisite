import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type HomeLocale = 'zh-CN' | 'en';

const messages = {
  'zh-CN': {
    common: {
      zhLabel: '中',
      enLabel: 'EN',
    },
    nav: {
      loadingSiteName: '加载中...',
      features: '核心特性',
      faq: '常见问题',
      changelog: '更新日志',
      sponsors: '赞助伙伴',
      serverSubmit: '提交服务器',
      serverSubmitShort: '提交',
      backToTop: '回到顶部',
      switchToLight: '切换到浅色模式',
      switchToDark: '切换到深色模式',
    },
    hero: {
      downloadUnavailable: '暂未开放下载',
      forPlatform: (platform: string) => `适用于 ${platform}`,
      lastUpdate: '最后更新',
      flatpakTitle: 'Flatpak 安装脚本',
      flatpakDescription: 'Linux 用户可一键复制后直接执行。',
      copyScript: '复制脚本',
      copied: '已复制',
      retryCopy: '重试复制',
      copiedToClipboard: '已复制到剪贴板',
      copyFailed: '复制失败',
    },
    faq: {
      title: '常见问题',
    },
    changelog: {
      homeTitle: '产品更新',
      pageTitle: '完整更新日志',
      pageSubtitle: '记录每一次版本迭代、修复与体验优化。',
      latest: '最新',
      viewAll: '查看完整更新日志',
    },
    sponsors: {
      title: '赞助伙伴',
    },
    footer: {
      friendLinks: '友情链接',
      noFriends: '暂无友链',
      privacyPolicy: '隐私政策',
      termsOfService: '服务条款',
      allSystemsNormal: '系统状态正常',
    },
  },
  en: {
    common: {
      zhLabel: '中',
      enLabel: 'EN',
    },
    nav: {
      loadingSiteName: 'Loading...',
      features: 'Features',
      faq: 'FAQ',
      changelog: 'Changelog',
      sponsors: 'Sponsors',
      serverSubmit: 'Submit Server',
      serverSubmitShort: 'Submit',
      backToTop: 'Back to top',
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
    },
    hero: {
      downloadUnavailable: 'Download unavailable',
      forPlatform: (platform: string) => `For ${platform}`,
      lastUpdate: 'Last update',
      flatpakTitle: 'Flatpak Install Script',
      flatpakDescription: 'Linux users can copy this script and run it directly.',
      copyScript: 'Copy script',
      copied: 'Copied',
      retryCopy: 'Retry copy',
      copiedToClipboard: 'Copied to clipboard',
      copyFailed: 'Copy failed',
    },
    faq: {
      title: 'Frequently Asked Questions',
    },
    changelog: {
      homeTitle: 'Product Updates',
      pageTitle: 'Full Changelog',
      pageSubtitle: 'A running record of releases, fixes, and improvements.',
      latest: 'Latest',
      viewAll: 'View full changelog',
    },
    sponsors: {
      title: 'Sponsors',
    },
    footer: {
      friendLinks: 'Friend Links',
      noFriends: 'No links yet',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      allSystemsNormal: 'All Systems Normal',
    },
  },
} as const;

type HomeMessages = (typeof messages)[HomeLocale];

interface HomeLocaleContextValue {
  locale: HomeLocale;
  setLocale: (locale: HomeLocale) => void;
  copy: HomeMessages;
}

const HomeLocaleContext = createContext<HomeLocaleContextValue | null>(null);

function detectLocale(): HomeLocale {
  if (typeof window === 'undefined') {
    return 'zh-CN';
  }

  const saved = window.localStorage.getItem('flowcore_locale');
  if (saved === 'zh-CN' || saved === 'en') {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export function HomeLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<HomeLocale>(() => detectLocale());

  useEffect(() => {
    window.localStorage.setItem('flowcore_locale', locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      copy: messages[locale],
    }),
    [locale],
  );

  return <HomeLocaleContext.Provider value={value}>{children}</HomeLocaleContext.Provider>;
}

export function useHomeLocale() {
  const context = useContext(HomeLocaleContext);
  if (!context) {
    throw new Error('useHomeLocale must be used within HomeLocaleProvider');
  }

  return context;
}

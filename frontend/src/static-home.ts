type StaticLocale = keyof typeof staticCopy;

declare global {
  interface Window {
    __flowcoreLoadDynamicHome?: () => void;
  }
}

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

const root = document.documentElement;

function getNormalizedPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

function applyInitialDocumentState() {
  try {
    const savedTheme = localStorage.getItem('flowcore_theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    root.classList.toggle('dark', shouldUseDark);
    root.classList.toggle('light', !shouldUseDark);
    root.setAttribute('data-static-home', getNormalizedPath() === '/' ? 'visible' : 'hidden');

    const cachedSeo = localStorage.getItem('flowcore_cached_seo');
    if (cachedSeo) {
      const parsedSeo = JSON.parse(cachedSeo) as { title?: string } | null;
      if (parsedSeo?.title) document.title = parsedSeo.title;
    }
  } catch {
    root.setAttribute('data-static-home', getNormalizedPath() === '/' ? 'visible' : 'hidden');
  }
}

function updateStaticHomeVisibility() {
  root.setAttribute('data-static-home', getNormalizedPath() === '/' ? 'visible' : 'hidden');
}

function wrapHistoryMethod(methodName: 'pushState' | 'replaceState') {
  const original = window.history[methodName];
  window.history[methodName] = function (...args) {
    const result = original.apply(this, args);
    window.dispatchEvent(new Event('flowcore-route-change'));
    return result;
  };
}

function syncThemeToggle(themeToggle: HTMLButtonElement | null) {
  if (!themeToggle) return;
  themeToggle.setAttribute('aria-pressed', root.classList.contains('dark') ? 'true' : 'false');
}

function setTheme(nextIsDark: boolean) {
  root.classList.toggle('dark', nextIsDark);
  root.classList.toggle('light', !nextIsDark);
  try {
    localStorage.setItem('flowcore_theme', nextIsDark ? 'dark' : 'light');
  } catch {}
}

const staticCopy = {
  'zh-CN': {
    lang: 'zh-CN',
    dir: 'ltr',
    ariaLabel: 'PiLauncher 静态介绍',
    localeLabel: '切换语言',
    themeLabel: '切换暗色模式',
    actionLabel: '页面操作',
    pointsLabel: '核心能力',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: '支持手柄操作的',
    subtitleLine2: 'MC启动器',
    description:
      'PiLauncher 是一款为掌机打造、兼容全平台的 Minecraft 启动器。\n让模组管理、账号登录和游戏启动更简单，也让玩家能更自然地在桌面、掌机与客厅场景之间切换。',
    primaryAction: '立即下载PiLauncher',
    secondaryAction: '查看更新日志',
    pointOneTitle: '掌机友好',
    pointOneText: '围绕手柄操作与移动场景优化，减少启动器在小屏设备上的操作负担。',
    pointTwoTitle: '模组管理',
    pointTwoText: '面向 Minecraft 玩家整理模组、整合包和版本流程，让配置更直观。',
    pointThreeTitle: '快速启动',
    pointThreeText: '账号登录、游戏启动与后续更新保持在同一体验里，少一点跳转，多一点顺手。',
  },
  en: {
    lang: 'en',
    dir: 'ltr',
    ariaLabel: 'PiLauncher static introduction',
    localeLabel: 'Switch language',
    themeLabel: 'Toggle dark mode',
    actionLabel: 'Page actions',
    pointsLabel: 'Core capabilities',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: 'A gamepad-friendly',
    subtitleLine2: 'MC launcher',
    description:
      'PiLauncher is a cross-platform Minecraft launcher designed for handheld gaming devices.\nIt makes mod management, account login, and game launching simpler across desktop, handheld, and couch-play scenarios.',
    primaryAction: 'Download PiLauncher',
    secondaryAction: 'View changelog',
    pointOneTitle: 'Handheld ready',
    pointOneText: 'Optimized for gamepad controls and compact screens, reducing friction on handheld devices.',
    pointTwoTitle: 'Mod management',
    pointTwoText: 'Organize Minecraft versions, mods, and modpacks with a clearer configuration flow.',
    pointThreeTitle: 'Fast launch',
    pointThreeText: 'Keep login, version selection, launching, and updates in one smooth experience.',
  },
  'zh-TW': {
    lang: 'zh-Hant',
    dir: 'ltr',
    ariaLabel: 'PiLauncher 靜態介紹',
    localeLabel: '切換語言',
    themeLabel: '切換深色模式',
    actionLabel: '頁面操作',
    pointsLabel: '核心能力',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: '支援手把操作的',
    subtitleLine2: 'MC 啟動器',
    description:
      'PiLauncher 是一款為掌機打造、兼容全平台的 Minecraft 啟動器。\n讓模組管理、帳號登入和遊戲啟動更簡單，也讓玩家能更自然地在桌面、掌機與客廳場景之間切換。',
    primaryAction: '立即下載 PiLauncher',
    secondaryAction: '查看更新日誌',
    pointOneTitle: '掌機友好',
    pointOneText: '圍繞手把操作與小螢幕場景最佳化，減少掌機上的操作負擔。',
    pointTwoTitle: '模組管理',
    pointTwoText: '為 Minecraft 玩家整理模組、整合包和版本流程，讓設定更直覺。',
    pointThreeTitle: '快速啟動',
    pointThreeText: '帳號登入、遊戲啟動與後續更新整合在同一體驗中，少一點跳轉，多一點順手。',
  },
  ja: {
    lang: 'ja',
    dir: 'ltr',
    ariaLabel: 'PiLauncher の静的紹介',
    localeLabel: '言語を切り替え',
    themeLabel: 'ダークモードを切り替え',
    actionLabel: 'ページ操作',
    pointsLabel: '主な機能',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: 'ゲームパッド対応の',
    subtitleLine2: 'MC ランチャー',
    description:
      'PiLauncher は携帯ゲーミングデバイス向けに作られた、全プラットフォーム対応の Minecraft ランチャーです。\nMod 管理、アカウントログイン、ゲーム起動をよりシンプルにし、デスクトップ、携帯機、リビング環境を自然に行き来できます。',
    primaryAction: 'PiLauncher をダウンロード',
    secondaryAction: '更新履歴を見る',
    pointOneTitle: '携帯機に最適',
    pointOneText: 'ゲームパッド操作と小さな画面に合わせて最適化し、携帯機での操作負担を減らします。',
    pointTwoTitle: 'Mod 管理',
    pointTwoText: 'Minecraft のバージョン、Mod、Mod パックの流れを整理し、設定をわかりやすくします。',
    pointThreeTitle: 'すばやく起動',
    pointThreeText: 'ログイン、起動、更新をひとつの体験にまとめ、移動を減らして使いやすくします。',
  },
  ko: {
    lang: 'ko',
    dir: 'ltr',
    ariaLabel: 'PiLauncher 정적 소개',
    localeLabel: '언어 전환',
    themeLabel: '다크 모드 전환',
    actionLabel: '페이지 작업',
    pointsLabel: '핵심 기능',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: '게임패드 친화적인',
    subtitleLine2: 'MC 런처',
    description:
      'PiLauncher는 휴대용 게이밍 기기를 위해 설계된 크로스 플랫폼 Minecraft 런처입니다.\n모드 관리, 계정 로그인, 게임 실행을 더 단순하게 만들고 데스크톱, 휴대용 기기, 거실 환경을 자연스럽게 오갈 수 있게 합니다.',
    primaryAction: 'PiLauncher 다운로드',
    secondaryAction: '변경 로그 보기',
    pointOneTitle: '휴대용 기기 친화',
    pointOneText: '게임패드 조작과 작은 화면에 맞게 최적화해 휴대용 기기에서의 조작 부담을 줄입니다.',
    pointTwoTitle: '모드 관리',
    pointTwoText: 'Minecraft 버전, 모드, 모드팩 흐름을 정리해 설정을 더 직관적으로 만듭니다.',
    pointThreeTitle: '빠른 실행',
    pointThreeText: '로그인, 실행, 업데이트를 하나의 경험으로 묶어 이동은 줄이고 사용성은 높입니다.',
  },
  fr: {
    lang: 'fr',
    dir: 'ltr',
    ariaLabel: 'Présentation statique de PiLauncher',
    localeLabel: 'Changer de langue',
    themeLabel: 'Basculer le mode sombre',
    actionLabel: 'Actions de page',
    pointsLabel: 'Fonctions clés',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: 'Un lanceur MC',
    subtitleLine2: 'compatible manette',
    description:
      'PiLauncher est un lanceur Minecraft multiplateforme conçu pour les consoles portables.\nIl simplifie la gestion des mods, la connexion aux comptes et le lancement du jeu, du bureau à la console portable jusqu’au salon.',
    primaryAction: 'Télécharger PiLauncher',
    secondaryAction: 'Voir le changelog',
    pointOneTitle: 'Pensé pour le portable',
    pointOneText: 'Optimisé pour la manette et les petits écrans afin de réduire les frictions sur les appareils portables.',
    pointTwoTitle: 'Gestion des mods',
    pointTwoText: 'Organise les versions Minecraft, les mods et les modpacks dans un flux plus clair.',
    pointThreeTitle: 'Lancement rapide',
    pointThreeText: 'Regroupe connexion, lancement et mises à jour dans une expérience plus fluide.',
  },
  ru: {
    lang: 'ru',
    dir: 'ltr',
    ariaLabel: 'Статическое описание PiLauncher',
    localeLabel: 'Сменить язык',
    themeLabel: 'Переключить тёмную тему',
    actionLabel: 'Действия страницы',
    pointsLabel: 'Основные возможности',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: 'MC-лаунчер',
    subtitleLine2: 'с поддержкой геймпада',
    description:
      'PiLauncher — кроссплатформенный лаунчер Minecraft, созданный для портативных игровых устройств.\nОн упрощает управление модами, вход в аккаунт и запуск игры на ПК, портативных устройствах и в гостиной.',
    primaryAction: 'Скачать PiLauncher',
    secondaryAction: 'Смотреть журнал изменений',
    pointOneTitle: 'Удобно на портативных устройствах',
    pointOneText: 'Оптимизирован для геймпада и небольших экранов, чтобы снизить лишние действия.',
    pointTwoTitle: 'Управление модами',
    pointTwoText: 'Упорядочивает версии Minecraft, моды и модпаки в более понятный процесс.',
    pointThreeTitle: 'Быстрый запуск',
    pointThreeText: 'Объединяет вход, запуск и обновления в один плавный сценарий.',
  },
  es: {
    lang: 'es',
    dir: 'ltr',
    ariaLabel: 'Introducción estática de PiLauncher',
    localeLabel: 'Cambiar idioma',
    themeLabel: 'Cambiar modo oscuro',
    actionLabel: 'Acciones de página',
    pointsLabel: 'Funciones clave',
    kicker: 'Gamepad-compatible Minecraft launcher',
    subtitleLine1: 'Un lanzador de MC',
    subtitleLine2: 'compatible con mando',
    description:
      'PiLauncher es un lanzador de Minecraft multiplataforma diseñado para dispositivos portátiles de juego.\nSimplifica la gestión de mods, el inicio de sesión y el lanzamiento del juego en escritorio, portátil y sala de estar.',
    primaryAction: 'Descargar PiLauncher',
    secondaryAction: 'Ver registro de cambios',
    pointOneTitle: 'Listo para portátiles',
    pointOneText: 'Optimizado para mando y pantallas pequeñas, con menos fricción en dispositivos portátiles.',
    pointTwoTitle: 'Gestión de mods',
    pointTwoText: 'Organiza versiones de Minecraft, mods y modpacks en un flujo más claro.',
    pointThreeTitle: 'Inicio rápido',
    pointThreeText: 'Une inicio de sesión, lanzamiento y actualizaciones en una experiencia más fluida.',
  },
  ar: {
    lang: 'ar',
    dir: 'rtl',
    ariaLabel: 'تعريف ثابت بـ PiLauncher',
    localeLabel: 'تغيير اللغة',
    themeLabel: 'تبديل الوضع الداكن',
    actionLabel: 'إجراءات الصفحة',
    pointsLabel: 'القدرات الأساسية',
    kicker: 'مشغل Minecraft متوافق مع أذرع التحكم',
    subtitleLine1: 'مشغل MC',
    subtitleLine2: 'مناسب لذراع التحكم',
    description:
      'PiLauncher هو مشغل Minecraft متعدد المنصات صمم لأجهزة اللعب المحمولة.\nيجعل إدارة الإضافات وتسجيل الحساب وتشغيل اللعبة أبسط بين سطح المكتب والجهاز المحمول وغرفة المعيشة.',
    primaryAction: 'تنزيل PiLauncher',
    secondaryAction: 'عرض سجل التغييرات',
    pointOneTitle: 'مناسب للأجهزة المحمولة',
    pointOneText: 'محسن لأذرع التحكم والشاشات الصغيرة لتقليل عبء الاستخدام على الأجهزة المحمولة.',
    pointTwoTitle: 'إدارة الإضافات',
    pointTwoText: 'ينظم إصدارات Minecraft والإضافات وحزم الإضافات في مسار أوضح.',
    pointThreeTitle: 'تشغيل سريع',
    pointThreeText: 'يجمع تسجيل الدخول والتشغيل والتحديثات في تجربة واحدة أكثر سلاسة.',
  },
} as const;

function getInitialStaticLocale(): StaticLocale {
  try {
    const savedStaticLocale = localStorage.getItem('flowcore_static_locale');
    if (savedStaticLocale && savedStaticLocale in staticCopy) return savedStaticLocale as StaticLocale;

    const savedLocale = localStorage.getItem('flowcore_locale');
    if (savedLocale && savedLocale in staticCopy) return savedLocale as StaticLocale;
  } catch {}

  const browserLocales = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  for (const browserLocaleValue of browserLocales) {
    const browserLocale = String(browserLocaleValue || '').toLowerCase();
    if (!browserLocale) continue;
    if (
      browserLocale.startsWith('zh-tw') ||
      browserLocale.startsWith('zh-hk') ||
      browserLocale.startsWith('zh-mo') ||
      browserLocale.includes('hant')
    ) return 'zh-TW';
    if (browserLocale.startsWith('zh')) return 'zh-CN';
    if (browserLocale.startsWith('ja')) return 'ja';
    if (browserLocale.startsWith('ko')) return 'ko';
    if (browserLocale.startsWith('fr')) return 'fr';
    if (browserLocale.startsWith('ru')) return 'ru';
    if (browserLocale.startsWith('es')) return 'es';
    if (browserLocale.startsWith('ar')) return 'ar';
    if (browserLocale.startsWith('en')) return 'en';
  }

  return 'en';
}

function applyStaticLocale(locale: string, themeToggle: HTMLButtonElement | null) {
  const nextLocale = locale in staticCopy ? locale as StaticLocale : 'en';
  const copy = staticCopy[nextLocale];
  const staticSection = document.getElementById('static-home-showcase');
  const staticActionGroup = document.querySelector('.static-home-actions');
  const staticPointsGroup = document.querySelector('.static-home-points');
  const staticLocaleGroup = document.querySelector('.static-home-locale-toggle');

  root.lang = copy.lang;
  root.setAttribute('data-static-locale', nextLocale);

  staticSection?.setAttribute('aria-label', copy.ariaLabel);
  staticSection?.setAttribute('dir', copy.dir);
  staticLocaleGroup?.setAttribute('aria-label', copy.localeLabel);
  themeToggle?.setAttribute('aria-label', copy.themeLabel);
  staticActionGroup?.setAttribute('aria-label', copy.actionLabel);
  staticPointsGroup?.setAttribute('aria-label', copy.pointsLabel);

  document.querySelectorAll<HTMLElement>('[data-static-i18n]').forEach(node => {
    const key = node.getAttribute('data-static-i18n') as keyof typeof copy | null;
    if (key && key in copy) node.textContent = copy[key];
  });

  document.querySelectorAll<HTMLButtonElement>('[data-static-locale-option]').forEach(button => {
    const isActive = button.getAttribute('data-static-locale-option') === nextLocale;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  try {
    localStorage.setItem('flowcore_static_locale', nextLocale);
    if (nextLocale === 'zh-CN' || nextLocale === 'en') {
      localStorage.setItem('flowcore_locale', nextLocale);
    }
  } catch {}
}

function getStaticAssetUrl(path: string | undefined) {
  if (!path) return '';
  if (/^(blob:|data:|https?:\/\/)/i.test(path)) return path;
  return path.charAt(0) === '/' ? path : `/${path}`;
}

function applyStaticLogo(logoUrl?: string, logoColor?: string) {
  const logoStack = document.querySelector<HTMLElement>('[data-static-logo-stack]');
  const logoMarks = document.querySelectorAll<HTMLElement>('[data-static-logo-mark]');
  const resolvedLogoUrl = getStaticAssetUrl(logoUrl || '/logo1024.png');
  const resolvedLogoColor = logoColor || '#10b981';

  logoStack?.style.setProperty('--static-logo-color', resolvedLogoColor);

  logoMarks.forEach(mark => {
    mark.textContent = '';
    if (resolvedLogoUrl) {
      const img = document.createElement('img');
      img.src = resolvedLogoUrl;
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      mark.appendChild(img);
      return;
    }

    const fallback = document.createElement('div');
    fallback.className = 'static-logo-fallback';
    fallback.textContent = 'Pi';
    mark.appendChild(fallback);
  });
}

function initStaticLogo() {
  try {
    const cachedBootstrap = localStorage.getItem('flowcore_cached_home_bootstrap');
    if (cachedBootstrap) {
      const parsedBootstrap = JSON.parse(cachedBootstrap) as {
        hero?: { logoUrl?: string; logoColor?: string };
      };
      if (parsedBootstrap?.hero) {
        applyStaticLogo(parsedBootstrap.hero.logoUrl, parsedBootstrap.hero.logoColor);
      }
    }
  } catch {}

  const logoStack = document.querySelector('[data-static-logo-stack]');
  if (logoStack) {
    fetch('/api/home/bootstrap')
      .then(response => (response.ok ? response.json() : null))
      .then((data: { hero?: { logoUrl?: string; logoColor?: string } } | null) => {
        if (data?.hero) {
          localStorage.setItem('flowcore_cached_home_bootstrap', JSON.stringify(data));
          applyStaticLogo(data.hero.logoUrl, data.hero.logoColor);
        }
      })
      .catch(() => {});
  }
}

let dynamicHomeLoaded = false;

function loadFlowcoreDynamicHome() {
  if (dynamicHomeLoaded) return;
  dynamicHomeLoaded = true;
  import('./main');
}

function initDynamicHomeLoading() {
  window.__flowcoreLoadDynamicHome = loadFlowcoreDynamicHome;

  if (getNormalizedPath() !== '/') {
    loadFlowcoreDynamicHome();
    return;
  }

  document.querySelectorAll('[data-static-dynamic-trigger]').forEach(node => {
    node.addEventListener('click', loadFlowcoreDynamicHome, { once: true });
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 120) loadFlowcoreDynamicHome();
  }, { once: true, passive: true });

  const requestIdleCallback = (window as WindowWithIdleCallback).requestIdleCallback;
  if (requestIdleCallback) {
    requestIdleCallback(loadFlowcoreDynamicHome, { timeout: 2600 });
  } else {
    window.setTimeout(loadFlowcoreDynamicHome, 1600);
  }
}

function initStaticHome() {
  applyInitialDocumentState();
  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', updateStaticHomeVisibility);
  window.addEventListener('flowcore-route-change', updateStaticHomeVisibility);
  updateStaticHomeVisibility();

  const themeToggle = document.querySelector<HTMLButtonElement>('[data-static-theme-toggle]');
  themeToggle?.addEventListener('click', event => {
    event.preventDefault();
    const nextIsDark = !root.classList.contains('dark');
    setTheme(nextIsDark);
    syncThemeToggle(themeToggle);
  });
  syncThemeToggle(themeToggle);

  document.querySelectorAll<HTMLButtonElement>('[data-static-locale-option]').forEach(button => {
    button.addEventListener('click', () => {
      applyStaticLocale(button.getAttribute('data-static-locale-option') || 'en', themeToggle);
    });
  });
  applyStaticLocale(getInitialStaticLocale(), themeToggle);

  initStaticLogo();
  initDynamicHomeLoading();
}

initStaticHome();

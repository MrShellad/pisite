import { useMemo, useState } from 'react';
import {
  ChevronDown,
  FileText,
  GlobeLock,
  HardDrive,
  HeartHandshake,
  History,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Link as LinkIcon,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  PanelTop,
  Server,
  Settings2,
  ShieldCheck,
  Star,
  Tags,
  X,
} from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { AdminThemeToggle } from './components/AdminThemeToggle';
import { useAdminSessionTimeout } from './hooks/useAdminSessionTimeout';

type NavLinkItem = {
  name: string;
  path: string;
  icon: JSX.Element;
};

const contentNavs: NavLinkItem[] = [
  { name: '控制台总览', path: '/admin', icon: <LayoutDashboard size={18} /> },
  { name: 'Hero 区管理', path: '/admin/hero', icon: <PanelTop size={18} /> },
  { name: '核心特性', path: '/admin/features', icon: <LayoutGrid size={18} /> },
  { name: '版本分发', path: '/admin/changelog', icon: <History size={18} /> },
  { name: 'FAQ 管理', path: '/admin/faqs', icon: <MessageCircle size={18} /> },
  { name: '赞助商配置', path: '/admin/sponsors', icon: <Server size={18} /> },
];

const ecosystemNavs: NavLinkItem[] = [
  { name: '服务器提交', path: '/admin/server-submissions', icon: <Star size={18} /> },
  { name: '标签字典管理', path: '/admin/server-tags', icon: <Tags size={18} /> },
  { name: '信令服务器', path: '/admin/signaling', icon: <Server size={18} /> },
  { name: '文章推送', path: '/admin/mccrawler', icon: <MessageCircle size={18} /> },
];

const dataNavs: NavLinkItem[] = [
  { name: '安装统计', path: '/admin/installations', icon: <HardDrive size={18} /> },
  { name: '捐赠用户授权', path: '/admin/donors', icon: <HeartHandshake size={18} /> },
];

const settingsNavs: NavLinkItem[] = [
  { name: '站点设置', path: '/admin/settings', icon: <LinkIcon size={16} /> },
  { name: '隐私与条款', path: '/admin/legal', icon: <FileText size={16} /> },
  { name: '邮件模板', path: '/admin/submission-email', icon: <Mail size={16} /> },
  { name: 'API Key 管理', path: '/admin/api-keys', icon: <KeyRound size={16} /> },
  { name: '公网 API 控制', path: '/admin/api-access', icon: <GlobeLock size={16} /> },
  { name: '账号安全', path: '/admin/account', icon: <ShieldCheck size={16} /> },
];

const allNavs = [...contentNavs, ...ecosystemNavs, ...dataNavs, ...settingsNavs];

const isPathActive = (pathname: string, target: string) =>
  pathname === target || (target !== '/admin' && pathname.startsWith(target));

const baseLinkClass = 'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all';
const activeLinkClass = 'bg-orange-50 font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
const inactiveLinkClass =
  'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200';

function getCurrentPageName(pathname: string) {
  const nav = allNavs.find(item => isPathActive(pathname, item.path));
  return nav?.name ?? '管理中心';
}

export default function AdminLayout() {
  useAdminSessionTimeout();
  const location = useLocation();
  const currentPageName = getCurrentPageName(location.pathname);
  const isSettingsGroupActive = useMemo(
    () => settingsNavs.some(nav => isPathActive(location.pathname, nav.path)),
    [location.pathname],
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsGroupActive);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const shouldShowSettings = isSettingsOpen || isSettingsGroupActive;

  const renderLink = (nav: NavLinkItem, onNavigate?: () => void) => {
    const isActive = isPathActive(location.pathname, nav.path);
    return (
      <Link
        key={nav.path}
        to={nav.path}
        onClick={onNavigate}
        className={`${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}
      >
        {isActive ? <span className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-orange-500" /> : null}
        <span className={`transition-transform ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>{nav.icon}</span>
        <span className="truncate">{nav.name}</span>
      </Link>
    );
  };

  const renderSection = (label: string, items: NavLinkItem[], onNavigate?: () => void) => (
    <div className="space-y-1.5">
      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
        {label}
      </p>
      {items.map(nav => renderLink(nav, onNavigate))}
    </div>
  );

  const renderNav = (onNavigate?: () => void) => (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {renderSection('内容与运营', contentNavs, onNavigate)}
        {renderSection('服务器生态', ecosystemNavs, onNavigate)}
        {renderSection('数据与授权', dataNavs, onNavigate)}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(prev => !prev)}
            className={`${baseLinkClass} w-full justify-between ${
              isSettingsGroupActive ? activeLinkClass : inactiveLinkClass
            }`}
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              <Settings2 size={18} />
              <span className="truncate">系统与安全</span>
            </span>
            <ChevronDown size={16} className={`shrink-0 transition-transform ${shouldShowSettings ? 'rotate-180' : ''}`} />
          </button>

          <div className={`grid overflow-hidden transition-all ${shouldShowSettings ? 'mt-1.5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-80'}`}>
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-1 pl-3">{settingsNavs.map(nav => renderLink(nav, onNavigate))}</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="border-t border-neutral-200 p-4 dark:border-white/5">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('flowcore_admin_token');
            window.location.href = '/';
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-red-500/80 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut size={16} />
          退出系统
        </button>
      </div>
    </>
  );

  const brand = (
    <div className="flex h-20 items-center border-b border-neutral-200 px-5 dark:border-white/5 lg:px-6">
      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-orange-500 shadow-lg shadow-blue-500/20">
        <PanelTop size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-lg font-bold tracking-wide text-neutral-900 dark:text-white">FlowCore</span>
        <span className="block truncate text-xs font-medium text-neutral-500 dark:text-neutral-500">Admin Console</span>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,_#fafafa_0%,_#f4f4f5_100%)] text-neutral-900 transition-colors duration-500 dark:bg-[linear-gradient(180deg,_#0a0a0a_0%,_#111111_100%)] dark:text-neutral-200 lg:flex">
      <aside className="sticky top-0 z-20 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white/85 shadow-sm backdrop-blur-xl transition-colors duration-500 dark:border-white/10 dark:bg-neutral-950/70 2xl:w-80 lg:flex">
        {brand}
        {renderNav()}
      </aside>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭导航"
            className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            {brand}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="absolute right-4 top-5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200"
              aria-label="关闭导航"
            >
              <X size={18} />
            </button>
            {renderNav(() => setIsMobileNavOpen(false))}
          </aside>
        </div>
      ) : null}

      <main className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-200/80 bg-neutral-50/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/80 sm:px-6 lg:min-h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 lg:hidden"
              aria-label="打开导航"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-neutral-900 dark:text-white/90 sm:text-xl">{currentPageName}</h2>
              <p className="hidden text-xs font-medium text-neutral-500 dark:text-neutral-500 sm:block">管理中心</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <AdminThemeToggle />
            <span className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-mono text-neutral-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-neutral-400 dark:shadow-none">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">System Online</span>
              <span className="sm:hidden">Online</span>
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-screen-2xl pb-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

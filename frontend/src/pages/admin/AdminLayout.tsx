import { LayoutDashboard, LayoutGrid, Link as LinkIcon, LogOut, MessageCircle, PanelTop, Server, Star, History, Tags, HeartHandshake, KeyRound, GlobeLock } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const adminNavs = [
  { name: '控制台总览', path: '/admin', icon: <LayoutDashboard size={18} /> },
  { name: 'Hero 区管理', path: '/admin/hero', icon: <PanelTop size={18} /> },
  { name: '核心特性', path: '/admin/features', icon: <LayoutGrid size={18} /> },
  { name: '更新日志', path: '/admin/changelog', icon: <History size={18} /> },
  { name: 'FAQ 管理', path: '/admin/faqs', icon: <MessageCircle size={18} /> },
  { name: '赞助商配置', path: '/admin/sponsors', icon: <Server size={18} /> },
  { name: '捐赠用户授权', path: '/admin/donors', icon: <HeartHandshake size={18} /> },
  { name: 'API Key 管理', path: '/admin/api-keys', icon: <KeyRound size={18} /> },
  { name: '公网 API 控制', path: '/admin/api-access', icon: <GlobeLock size={18} /> },
  { name: '站点设置', path: '/admin/settings', icon: <LinkIcon size={18} /> },
  { name: '爬虫配置', path: '/admin/mccrawler', icon: <MessageCircle size={18} /> },
  { name: '服务器提交', path: '/admin/server-submissions', icon: <Star size={18} /> },
  { name: '标签字典管理', path: '/admin/server-tags', icon: <Tags size={18} /> },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-neutral-50 text-neutral-900 transition-colors duration-500 dark:bg-[#0a0a0a] dark:text-neutral-200">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-blue-400/20 blur-[120px] dark:bg-blue-600/10" />
        <div className="absolute bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-orange-300/20 blur-[120px] dark:bg-orange-500/10" />
      </div>

      <aside className="z-10 m-4 mr-0 flex w-64 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 shadow-lg backdrop-blur-xl transition-colors duration-500 dark:border-white/10 dark:bg-white/5 dark:shadow-2xl">
        <div className="flex h-20 items-center border-b border-neutral-200 px-6 dark:border-white/5">
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-orange-500 shadow-lg shadow-blue-500/20">
            <PanelTop size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-wide text-neutral-900 dark:text-white">FlowCore</span>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
          {adminNavs.map((nav) => {
            const isActive =
              location.pathname === nav.path ||
              (nav.path !== '/admin' && location.pathname.startsWith(nav.path));

            return (
              <Link
                key={nav.name}
                to={nav.path}
                className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 ${
                  isActive
                    ? 'bg-orange-50 font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200'
                }`}
              >
                {isActive ? (
                  <div className="absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                ) : null}
                <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {nav.icon}
                </span>
                {nav.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 p-4 dark:border-white/5">
          <button
            onClick={() => {
              localStorage.removeItem('flowcore_admin_token');
              window.location.href = '/';
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-red-500/80 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut size={16} />
            退出系统
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center justify-between px-8">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white/90">管理中心</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-mono text-neutral-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-neutral-400 dark:shadow-none">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              System Online
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 pt-0">
          <div className="mx-auto max-w-6xl pb-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

// frontend/src/pages/admin/AdminLayout.tsx
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, History, Link as LinkIcon, LogOut, LayoutGrid, MessageCircle, PanelTop } from 'lucide-react';

const adminNavs = [
  { name: '控制台总览', path: '/admin', icon: <LayoutDashboard size={18} /> },
  { name: 'Hero 区管理', path: '/admin/hero', icon: <PanelTop size={18} /> },
  { name: '核心特性', path: '/admin/features', icon: <LayoutGrid size={18} /> },
  { name: '更新日志', path: '/admin/changelog', icon: <History size={18} /> },
  { name: 'FAQ 管理', path: '/admin/faqs', icon: <MessageCircle size={18} /> },
  { name: '赞助商配置', path: '/admin/sponsors', icon: <Server size={18} /> },
  { name: '杂项配置', path: '/admin/settings', icon: <LinkIcon size={18} /> },
  { name: '爬虫配置', path: '/admin/mccrawler', icon: <MessageCircle size={18} /> }
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-200 relative overflow-hidden font-sans transition-colors duration-500">
      
      {/* 双模全局氛围背景 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* 悬浮毛玻璃侧边栏 */}
      <aside className="w-64 m-4 mr-0 rounded-2xl bg-white/80 dark:bg-white/5 border border-neutral-200 dark:border-white/10 backdrop-blur-xl flex flex-col z-10 shadow-lg dark:shadow-2xl overflow-hidden transition-colors duration-500">
        <div className="h-20 flex items-center px-6 border-b border-neutral-200 dark:border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mr-3">
            <PanelTop size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-wide text-neutral-900 dark:text-white">FlowCore</span>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {adminNavs.map((nav) => {
            const isActive = location.pathname === nav.path || (nav.path !== '/admin' && location.pathname.startsWith(nav.path));
            return (
              <Link
                key={nav.name}
                to={nav.path}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
                <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{nav.icon}</span>
                {nav.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-white/5">
          <button 
            onClick={() => {
              localStorage.removeItem('flowcore_admin_token');
              window.location.href = '/';
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-red-500/80 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-medium"
          >
            <LogOut size={16} /> 退出系统
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
        <header className="h-20 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white/90">管理中心</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs font-mono bg-white/80 dark:bg-white/5 border border-neutral-200 dark:border-white/10 px-3 py-1.5 rounded-full text-neutral-600 dark:text-neutral-400 shadow-sm dark:shadow-none backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> System Online
            </span>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8 pt-0">
          <div className="max-w-6xl mx-auto pb-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
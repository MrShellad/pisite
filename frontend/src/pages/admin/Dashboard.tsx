import { useEffect, useState, type ReactNode } from 'react';
import { Apple, Download, Monitor, Terminal, TrendingUp, Users, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { api } from '../../api/client';

type DailyTrend = {
  date: string;
  downloads: number;
  activations: number;
};

type PlatformDownload = {
  platform: string;
  count: number;
};

type DashboardStats = {
  totalDownloads: number;
  uniqueDownloads: number;
  totalActivations: number;
  dailyTrends: DailyTrend[];
  platformDownloads: PlatformDownload[];
};

type CardShellProps = {
  children: ReactNode;
  className?: string;
};

function CardShell({ children, className = '' }: CardShellProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white/85 p-5 shadow-sm backdrop-blur-xl transition-colors duration-500 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(res => setStats(res.data)).catch(console.error);
  }, []);

  if (!stats) return <div className="text-neutral-500 animate-pulse">Syncing Telemetry...</div>;

  const getPlatformIcon = (name: string) => {
    if (name.toLowerCase().includes('mac')) return <Apple size={16} />;
    if (name.toLowerCase().includes('win')) return <Monitor size={16} />;
    return <Terminal size={16} />;
  };

  const conversionRate =
    stats.uniqueDownloads > 0
      ? ((stats.totalActivations / stats.uniqueDownloads) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
            控制台总览
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            下载、激活与平台分布的实时概览。
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          数据同步正常
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-5">
        <CardShell className="border-l-4 border-l-blue-500">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            <Download size={20} />
          </div>
          <h3 className="mb-1 text-3xl font-bold text-neutral-900 dark:text-white">{stats.totalDownloads}</h3>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">总下载量</p>
        </CardShell>

        <CardShell className="border-l-4 border-l-indigo-500">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Users size={20} />
          </div>
          <h3 className="mb-1 text-3xl font-bold text-neutral-900 dark:text-white">{stats.uniqueDownloads}</h3>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">独立设备</p>
        </CardShell>

        <CardShell className="border-l-4 border-l-emerald-500">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Zap size={20} />
          </div>
          <h3 className="mb-1 text-3xl font-bold text-neutral-900 dark:text-white">{stats.totalActivations}</h3>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">激活装机</p>
        </CardShell>

        <CardShell className="border-l-4 border-l-amber-500">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <TrendingUp size={20} />
          </div>
          <h3 className="mb-1 text-3xl font-bold text-neutral-900 dark:text-white">{conversionRate}%</h3>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">转化率</p>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <CardShell className="flex min-h-[360px] flex-col sm:min-h-[420px]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">七日流量趋势 (7D)</h3>
            <div className="flex items-center gap-4 text-xs font-semibold text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                downloads
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                activations
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyTrends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.15} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#eee', borderRadius: '12px', color: '#000' }} />
                <Area type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={3} fill="url(#colorDl)" />
                <Area type="monotone" dataKey="activations" stroke="#10b981" strokeWidth={3} fill="url(#colorAc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell>
          <h3 className="mb-6 text-sm font-bold text-neutral-900 dark:text-white">平台分布占比</h3>
          <div className="space-y-5">
            {stats.platformDownloads.map((item) => {
              const pct = stats.totalDownloads > 0 ? Math.round((item.count / stats.totalDownloads) * 100) : 0;
              return (
                <div key={item.platform} className="space-y-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-neutral-600 dark:text-neutral-300">
                      {getPlatformIcon(item.platform)}
                      <span className="truncate">{item.platform}</span>
                    </span>
                    <span className="shrink-0 font-mono font-bold text-neutral-900 dark:text-white">
                      {item.count}
                      <span className="ml-1 font-normal text-neutral-400 dark:text-neutral-600">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200/70 dark:bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

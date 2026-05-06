import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Cpu,
  HardDrive,
  Monitor,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api } from '../../api/client';
import { useVirtualList } from '../../hooks/useVirtualList';

type InstallationReport = {
  installationId: string;
  platform: string;
  memoryBytes?: number | null;
  gpu: string;
  appVersion: string;
  firstInstalledAt: string;
  lastReportedAt: string;
};

type CountStat = {
  count: number;
};

type PlatformStat = CountStat & {
  platform: string;
};

type VersionStat = CountStat & {
  appVersion: string;
};

type WeekPoint = {
  dayIndex: number;
  dayLabel: string;
  thisWeek: number;
  lastWeek: number;
};

type InstallationStats = {
  totalInstalls: number;
  activeThisWeek: number;
  newThisWeek: number;
  newLastWeek: number;
  platformStats: PlatformStat[];
  versionStats: VersionStat[];
  weekComparison: WeekPoint[];
  recentReports: InstallationReport[];
};

const cardClass =
  'rounded-2xl border border-neutral-200/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';
const tableCellClass = 'border-b border-neutral-100 px-3 py-3 text-xs dark:border-white/5';

function formatMemory(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '-';
  const gib = bytes / 1024 / 1024 / 1024;
  return `${gib.toFixed(gib >= 10 ? 0 : 1)} GB`;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? '+100%' : '0%';
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function ManageInstallations() {
  const [stats, setStats] = useState<InstallationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const reports = stats?.recentReports ?? [];
  const reportVirtualRows = useVirtualList(reports, 54, 10);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<InstallationStats>('/admin/installations');
      setStats(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const weekTotal = useMemo(
    () => stats?.weekComparison.reduce((sum, item) => sum + item.thisWeek, 0) ?? 0,
    [stats],
  );
  const lastWeekTotal = useMemo(
    () => stats?.weekComparison.reduce((sum, item) => sum + item.lastWeek, 0) ?? 0,
    [stats],
  );

  if (!stats && isLoading) {
    return <div className="animate-pulse text-sm text-neutral-500">正在读取安装统计...</div>;
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500 dark:border-white/10">
        暂无安装统计数据。
      </div>
    );
  }

  const topPlatformTotal = stats.platformStats.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
            安装统计
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            客户端安装 ID、平台、硬件与版本上报的汇总视图。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchStats()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <section className={`${cardClass} border-l-4 border-l-blue-500`}>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            <HardDrive size={20} />
          </div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.totalInstalls}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">总安装数</div>
        </section>

        <section className={`${cardClass} border-l-4 border-l-emerald-500`}>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Activity size={20} />
          </div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white">{stats.activeThisWeek}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">近 7 天活跃</div>
        </section>

        <section className={`${cardClass} border-l-4 border-l-orange-500`}>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
            <TrendingUp size={20} />
          </div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white">{weekTotal}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">本周新增</div>
        </section>

        <section className={`${cardClass} border-l-4 border-l-violet-500`}>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
            <BarChart3 size={20} />
          </div>
          <div className="text-3xl font-bold text-neutral-900 dark:text-white">
            {percentChange(stats.newThisWeek, stats.newLastWeek)}
          </div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">环比上周</div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className={`${cardClass} flex min-h-[390px] flex-col`}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">本周 / 上周安装对比</h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                本周 {weekTotal}，上周 {lastWeekTotal}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                本周
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                上周
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weekComparison} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="installThisWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="installLastWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.15} />
                <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.94)',
                    borderColor: '#eee',
                    borderRadius: '12px',
                    color: '#000',
                  }}
                />
                <Area type="monotone" dataKey="lastWeek" name="上周" stroke="#3b82f6" strokeWidth={2.5} fill="url(#installLastWeek)" />
                <Area type="monotone" dataKey="thisWeek" name="本周" stroke="#f97316" strokeWidth={3} fill="url(#installThisWeek)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${cardClass} space-y-6`}>
          <div>
            <h3 className="mb-4 text-sm font-bold text-neutral-900 dark:text-white">平台分布</h3>
            <div className="space-y-3">
              {stats.platformStats.map(item => {
                const pct = topPlatformTotal > 0 ? Math.round((item.count / topPlatformTotal) * 100) : 0;
                return (
                  <div key={item.platform} className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium text-neutral-700 dark:text-neutral-300">
                        <Monitor size={15} />
                        <span className="truncate">{item.platform || 'unknown'}</span>
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold text-neutral-900 dark:text-white">版本 Top 10</h3>
            <div className="space-y-2">
              {stats.versionStats.map(item => (
                <div key={item.appVersion} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50/70 px-3 py-2 text-sm dark:border-white/5 dark:bg-white/[0.02]">
                  <span className="truncate font-mono text-xs text-neutral-700 dark:text-neutral-300">{item.appVersion || 'unknown'}</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
            <Cpu size={18} className="text-orange-500" />
            安装上报明细
          </h3>
          <span className="text-xs text-neutral-500">最近 {reports.length} 条</span>
        </div>
        <div
          ref={reportVirtualRows.containerRef}
          onScroll={reportVirtualRows.handleScroll}
          className="max-h-[620px] overflow-auto rounded-2xl border border-neutral-200/80 dark:border-white/10"
        >
          <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-[230px] border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">安装 ID</th>
                <th className="sticky top-0 z-10 w-[120px] border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">平台</th>
                <th className="sticky top-0 z-10 w-[110px] border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">内存</th>
                <th className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">显卡</th>
                <th className="sticky top-0 z-10 w-[120px] border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">版本</th>
                <th className="sticky top-0 z-10 w-[170px] border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">首次安装</th>
                <th className="sticky top-0 z-10 w-[170px] border-b border-neutral-200 bg-white/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95">最后上报</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">
                    暂无安装上报。
                  </td>
                </tr>
              ) : (
                <>
                  {reportVirtualRows.paddingTop > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={7} className="border-0 p-0" style={{ height: reportVirtualRows.paddingTop }} />
                    </tr>
                  )}
                  {reportVirtualRows.virtualItems.map(item => (
                    <tr key={item.installationId} className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-white/[0.03]">
                      <td className={`${tableCellClass} font-mono text-[11px] text-neutral-700 dark:text-neutral-300`}>
                        <span className="block truncate">{item.installationId}</span>
                      </td>
                      <td className={`${tableCellClass} text-neutral-700 dark:text-neutral-300`}>{item.platform}</td>
                      <td className={`${tableCellClass} font-mono text-neutral-600 dark:text-neutral-400`}>{formatMemory(item.memoryBytes)}</td>
                      <td className={`${tableCellClass} text-neutral-700 dark:text-neutral-300`}>
                        <span className="block truncate">{item.gpu || '-'}</span>
                      </td>
                      <td className={`${tableCellClass} font-mono text-neutral-700 dark:text-neutral-300`}>{item.appVersion || '-'}</td>
                      <td className={`${tableCellClass} text-[11px] text-neutral-500`}>{item.firstInstalledAt}</td>
                      <td className={`${tableCellClass} text-[11px] text-neutral-500`}>{item.lastReportedAt}</td>
                    </tr>
                  ))}
                  {reportVirtualRows.paddingBottom > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={7} className="border-0 p-0" style={{ height: reportVirtualRows.paddingBottom }} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

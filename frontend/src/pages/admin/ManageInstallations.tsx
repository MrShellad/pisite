import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Edit3,
  HardDrive,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TrendingUp,
  X,
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
import { useAdminFeedback } from './components/AdminFeedback';

type InstallationReport = {
  installationId: string;
  platform: string;
  memoryBytes?: number | null;
  gpu: string;
  gpuRaw: string;
  appVersion: string;
  firstInstalledAt: string;
  lastReportedAt: string;
};

type GpuNameMapping = {
  id: string;
  matchText: string;
  displayName: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type GpuNameMappingForm = {
  matchText: string;
  displayName: string;
  priority: string;
  enabled: boolean;
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
const tableHeaderCellClass =
  'sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:border-white/10 dark:bg-neutral-950/95';
const tableCellClass = 'border-b border-neutral-100 px-3 py-3 text-center align-middle text-xs dark:border-white/5';
const pageSizeOptions = [10, 20, 30];
const emptyGpuMappingForm: GpuNameMappingForm = {
  matchText: '',
  displayName: '',
  priority: '0',
  enabled: true,
};

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

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
  if (matched) {
    return `${matched[1]}-${matched[2]}-${matched[3]} ${matched[4]}:${matched[5]}:${matched[6]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => part.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

export default function ManageInstallations() {
  const { notify } = useAdminFeedback();
  const mappingEditorRef = useRef<HTMLDivElement | null>(null);
  const mappingMatchInputRef = useRef<HTMLInputElement | null>(null);
  const [stats, setStats] = useState<InstallationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<GpuNameMapping[]>([]);
  const [mappingForm, setMappingForm] = useState<GpuNameMappingForm>(emptyGpuMappingForm);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const reports = stats?.recentReports ?? [];
  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reports.slice(start, start + pageSize);
  }, [currentPage, pageSize, reports]);
  const reportVirtualRows = useVirtualList(paginatedReports, 68, 6);

  const fetchStats = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await api.get<InstallationStats>('/admin/installations');
      setStats(response.data);
    } catch (err) {
      console.error(err);
      setLoadError('安装统计读取失败，请检查网络或服务端日志。');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await api.get<GpuNameMapping[]>('/admin/installations/gpu-mappings');
      setMappings(response.data);
    } catch (err) {
      console.error(err);
      notify('GPU 映射读取失败', '请检查网络或服务端日志。', 'error');
    }
  };

  useEffect(() => {
    void fetchStats();
    void fetchMappings();
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    reportVirtualRows.containerRef.current?.scrollTo({ top: 0 });
  }, [currentPage, pageSize, reportVirtualRows.containerRef]);

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
        <div>{loadError ?? '暂无安装统计数据。'}</div>
        {loadError ? (
          <button
            type="button"
            onClick={() => void fetchStats()}
            className="mt-4 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
          >
            重试
          </button>
        ) : null}
      </div>
    );
  }

  const topPlatformTotal = stats.platformStats.reduce((sum, item) => sum + item.count, 0);
  const pageStart = reports.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(reports.length, currentPage * pageSize);

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  };

  const copyInstallationId = async (installationId: string) => {
    try {
      await navigator.clipboard.writeText(installationId);
      notify('安装 ID 已复制', installationId, 'success');
    } catch {
      notify('复制失败', '浏览器拒绝访问剪贴板，请手动选择复制。', 'error');
    }
  };

  const openMappingModal = () => {
    setIsMappingModalOpen(true);
    void fetchMappings();
  };

  const closeMappingModal = () => {
    setIsMappingModalOpen(false);
    resetMappingForm();
  };

  const resetMappingForm = () => {
    setMappingForm(emptyGpuMappingForm);
    setEditingMappingId(null);
  };

  const editMapping = (mapping: GpuNameMapping) => {
    setEditingMappingId(mapping.id);
    setMappingForm({
      matchText: mapping.matchText,
      displayName: mapping.displayName,
      priority: String(mapping.priority),
      enabled: mapping.enabled,
    });
    window.requestAnimationFrame(() => {
      mappingEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      mappingMatchInputRef.current?.focus();
    });
  };

  const saveMapping = async () => {
    const payload = {
      matchText: mappingForm.matchText.trim(),
      displayName: mappingForm.displayName.trim(),
      priority: Number(mappingForm.priority) || 0,
      enabled: mappingForm.enabled,
    };

    if (!payload.matchText || !payload.displayName) {
      notify('映射未填写完整', '匹配文本和显示名称都不能为空。', 'error');
      return;
    }

    setIsSavingMapping(true);
    try {
      if (editingMappingId) {
        await api.put(`/admin/installations/gpu-mappings/${editingMappingId}`, payload);
        notify('GPU 映射已更新', payload.displayName, 'success');
      } else {
        await api.post('/admin/installations/gpu-mappings', payload);
        notify('GPU 映射已创建', payload.displayName, 'success');
      }
      resetMappingForm();
      await Promise.all([fetchMappings(), fetchStats()]);
    } catch (err: any) {
      console.error(err);
      notify('GPU 映射保存失败', err?.response?.data ?? '请检查映射文本是否重复。', 'error');
    } finally {
      setIsSavingMapping(false);
    }
  };

  const deleteMapping = async (mapping: GpuNameMapping) => {
    if (!window.confirm(`删除 GPU 映射「${mapping.matchText} -> ${mapping.displayName}」？`)) return;

    try {
      await api.delete(`/admin/installations/gpu-mappings/${mapping.id}`);
      notify('GPU 映射已删除', mapping.displayName, 'success');
      if (editingMappingId === mapping.id) resetMappingForm();
      await Promise.all([fetchMappings(), fetchStats()]);
    } catch (err) {
      console.error(err);
      notify('GPU 映射删除失败', '请检查网络或服务端日志。', 'error');
    }
  };

  const toggleMapping = async (mapping: GpuNameMapping) => {
    try {
      await api.put(`/admin/installations/gpu-mappings/${mapping.id}`, {
        matchText: mapping.matchText,
        displayName: mapping.displayName,
        priority: mapping.priority,
        enabled: !mapping.enabled,
      });
      await Promise.all([fetchMappings(), fetchStats()]);
    } catch (err) {
      console.error(err);
      notify('GPU 映射状态更新失败', '请检查网络或服务端日志。', 'error');
    }
  };

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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
            <Cpu size={18} className="text-orange-500" />
            安装上报明细
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>
              共 {reports.length} 条，显示 {pageStart}-{pageEnd}
            </span>
            <button
              type="button"
              onClick={openMappingModal}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
            >
              <Cpu size={14} />
              GPU 映射
            </button>
            <label className="inline-flex items-center gap-2">
              <span>每页</span>
              <select
                value={pageSize}
                onChange={event => changePageSize(Number(event.target.value))}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
              >
                {pageSizeOptions.map(option => (
                  <option key={option} value={option}>
                    {option} 条
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950">
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35 dark:text-neutral-300 dark:hover:bg-white/10"
                aria-label="上一页"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="min-w-[70px] border-x border-neutral-200 px-3 text-center font-semibold text-neutral-700 dark:border-white/10 dark:text-neutral-200">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                className="flex h-8 w-8 items-center justify-center text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35 dark:text-neutral-300 dark:hover:bg-white/10"
                aria-label="下一页"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
        <div
          ref={reportVirtualRows.containerRef}
          onScroll={reportVirtualRows.handleScroll}
          className="max-h-[620px] overflow-auto rounded-2xl border border-neutral-200/80 dark:border-white/10"
        >
          <table className="w-full min-w-[1230px] table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={`${tableHeaderCellClass} w-[360px]`}>安装 ID</th>
                <th className={`${tableHeaderCellClass} w-[100px]`}>平台</th>
                <th className={`${tableHeaderCellClass} w-[100px]`}>内存</th>
                <th className={`${tableHeaderCellClass} w-[220px]`}>显卡</th>
                <th className={`${tableHeaderCellClass} w-[110px]`}>版本</th>
                <th className={`${tableHeaderCellClass} w-[170px]`}>首次安装</th>
                <th className={`${tableHeaderCellClass} w-[170px]`}>最后上报</th>
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
                        <button
                          type="button"
                          onClick={() => void copyInstallationId(item.installationId)}
                          className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg px-2 py-1 transition hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                          title="复制安装 ID"
                        >
                          <span className="block truncate">{item.installationId}</span>
                          <Copy size={13} className="shrink-0 opacity-60" />
                        </button>
                      </td>
                      <td className={`${tableCellClass} text-neutral-700 dark:text-neutral-300`}>{item.platform}</td>
                      <td className={`${tableCellClass} font-mono text-neutral-600 dark:text-neutral-400`}>{formatMemory(item.memoryBytes)}</td>
                      <td className={`${tableCellClass} text-neutral-700 dark:text-neutral-300`}>
                        <span className="block truncate font-semibold" title={item.gpuRaw || item.gpu || '-'}>
                          {item.gpu || '-'}
                        </span>
                        {item.gpuRaw && item.gpuRaw !== item.gpu ? (
                          <span className="mt-0.5 block truncate text-[10px] text-neutral-400" title={item.gpuRaw}>
                            {item.gpuRaw}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${tableCellClass} font-mono text-neutral-700 dark:text-neutral-300`}>{item.appVersion || '-'}</td>
                      <td className={`${tableCellClass} text-[11px] text-neutral-500`}>{formatDateTime(item.firstInstalledAt)}</td>
                      <td className={`${tableCellClass} text-[11px] text-neutral-500`}>{formatDateTime(item.lastReportedAt)}</td>
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

      {isMappingModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="关闭 GPU 映射"
            className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
            onClick={closeMappingModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gpu-mapping-title"
            className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-white/10">
              <div className="min-w-0">
                <h3 id="gpu-mapping-title" className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                  <Cpu size={18} className="text-orange-500" />
                  GPU JSON 映射表
                </h3>
                <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                  按“匹配文本”命中客户端原始 GPU 上报，安装明细会显示维护后的显卡名称。
                </p>
              </div>
              <button
                type="button"
                onClick={closeMappingModal}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
                aria-label="关闭弹窗"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-5">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={resetMappingForm}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                >
                  <Plus size={16} />
                  新映射
                </button>
              </div>

              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">
          <div ref={mappingEditorRef} className="rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="mb-4 text-sm font-bold text-neutral-900 dark:text-white">
              {editingMappingId ? '编辑映射' : '添加映射'}
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-neutral-500">匹配文本</span>
                <input
                  ref={mappingMatchInputRef}
                  value={mappingForm.matchText}
                  onChange={event => setMappingForm(form => ({ ...form, matchText: event.target.value }))}
                  placeholder="Phoenix1"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-neutral-500">显示名称</span>
                <input
                  value={mappingForm.displayName}
                  onChange={event => setMappingForm(form => ({ ...form, displayName: event.target.value }))}
                  placeholder="AMD 780M"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
                />
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-neutral-500">优先级</span>
                  <input
                    type="number"
                    value={mappingForm.priority}
                    onChange={event => setMappingForm(form => ({ ...form, priority: event.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={mappingForm.enabled}
                    onChange={event => setMappingForm(form => ({ ...form, enabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-orange-500 focus:ring-orange-400"
                  />
                  启用
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void saveMapping()}
                  disabled={isSavingMapping}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  <Save size={16} className={isSavingMapping ? 'animate-pulse' : ''} />
                  保存
                </button>
                {editingMappingId ? (
                  <button
                    type="button"
                    onClick={resetMappingForm}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                    aria-label="取消编辑"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto rounded-2xl border border-neutral-200/80 dark:border-white/10">
            <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={`${tableHeaderCellClass} w-[220px]`}>匹配文本</th>
                  <th className={`${tableHeaderCellClass} w-[150px]`}>显示名称</th>
                  <th className={`${tableHeaderCellClass} w-[70px]`}>优先级</th>
                  <th className={`${tableHeaderCellClass} w-[80px]`}>状态</th>
                  <th className={`${tableHeaderCellClass} w-[100px]`}>操作</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-neutral-500">
                      暂无 GPU 映射。
                    </td>
                  </tr>
                ) : (
                  mappings.map(mapping => (
                    <tr
                      key={mapping.id}
                      className={`transition-colors hover:bg-neutral-50/70 dark:hover:bg-white/[0.03] ${
                        editingMappingId === mapping.id ? 'bg-orange-50/70 dark:bg-orange-500/10' : ''
                      }`}
                    >
                      <td className={`${tableCellClass} text-left`}>
                        <span className="block truncate font-mono text-[11px] text-neutral-700 dark:text-neutral-300" title={mapping.matchText}>
                          {mapping.matchText}
                        </span>
                      </td>
                      <td className={`${tableCellClass} font-semibold text-neutral-800 dark:text-neutral-100`}>{mapping.displayName}</td>
                      <td className={`${tableCellClass} font-mono text-neutral-600 dark:text-neutral-400`}>{mapping.priority}</td>
                      <td className={tableCellClass}>
                        <button
                          type="button"
                          onClick={() => void toggleMapping(mapping)}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                            mapping.enabled
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400'
                          }`}
                        >
                          {mapping.enabled ? '启用' : '停用'}
                        </button>
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => editMapping(mapping)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
                            aria-label="编辑映射"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteMapping(mapping)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                            aria-label="删除映射"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

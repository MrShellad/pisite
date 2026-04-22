import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleAlert,
  Globe,
  GlobeLock,
  Info,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

import { api } from '../../api/client';

type ApiEndpointPolicy = {
  id: number;
  method: string;
  pathTemplate: string;
  groupName: string;
  publicEnabled: boolean;
  requireApiKey: boolean;
  updatedAt?: string | null;
};

type ToastTone = 'info' | 'error';

type ToastItem = {
  id: number;
  title: string;
  description: string;
  tone: ToastTone;
};

const cardClass =
  'rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';
const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-neutral-600 dark:focus:bg-blue-500/5';
const tableHeaderCellClass =
  'sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 dark:text-neutral-500';
const tableCellClass = 'border-b border-neutral-100 px-3 py-3 align-top text-xs dark:border-white/5';

export default function ManageApiAccess() {
  const [items, setItems] = useState<ApiEndpointPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
    };
  }, []);

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const pushToast = (title: string, description: string, tone: ToastTone) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, title, description, tone }]);

    const timerId = window.setTimeout(() => {
      dismissToast(id);
    }, tone === 'error' ? 4800 : 3200);
    toastTimersRef.current.push(timerId);
  };

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ApiEndpointPolicy[]>('/admin/api-endpoints');
      setItems(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const base = keyword
      ? items.filter(item =>
          `${item.method} ${item.pathTemplate} ${item.groupName}`.toLowerCase().includes(keyword),
        )
      : items;

    const priority = (item: ApiEndpointPolicy) => {
      if (item.groupName !== 'public') return 0;
      if (item.requireApiKey) return 3;
      if (item.publicEnabled) return 2;
      return 1;
    };

    return [...base].sort((left, right) => {
      return (
        priority(right) - priority(left) ||
        left.pathTemplate.localeCompare(right.pathTemplate) ||
        left.method.localeCompare(right.method)
      );
    });
  }, [items, query]);

  const protectedCount = useMemo(
    () => filtered.filter(item => item.groupName === 'public' && item.requireApiKey).length,
    [filtered],
  );
  const publicCount = useMemo(
    () => filtered.filter(item => item.groupName === 'public' && !item.requireApiKey).length,
    [filtered],
  );
  const fixedCount = useMemo(
    () => filtered.filter(item => item.groupName !== 'public').length,
    [filtered],
  );

  const updateOne = async (
    item: ApiEndpointPolicy,
    patch: Partial<Pick<ApiEndpointPolicy, 'publicEnabled' | 'requireApiKey'>>,
  ) => {
    const next = { ...item, ...patch };
    setSavingIds(prev => [...prev, item.id]);
    setItems(prev => prev.map(row => (row.id === item.id ? next : row)));

    try {
      await api.put(`/admin/api-endpoints/${item.id}`, {
        publicEnabled: next.publicEnabled,
        requireApiKey: next.requireApiKey,
      });
      return true;
    } catch (error: any) {
      setItems(prev => prev.map(row => (row.id === item.id ? item : row)));
      pushToast(
        '保存失败',
        error?.response?.data ?? `${item.method} ${item.pathTemplate} 的访问策略保存失败。`,
        'error',
      );
      return false;
    } finally {
      setSavingIds(prev => prev.filter(id => id !== item.id));
    }
  };

  const handlePublicToggle = async (item: ApiEndpointPolicy, checked: boolean) => {
    await updateOne(item, { publicEnabled: checked });
  };

  const handleTokenToggle = async (item: ApiEndpointPolicy, checked: boolean) => {
    const ok = await updateOne(item, { requireApiKey: checked });
    if (ok && checked) {
      pushToast(
        '已启用 Token 授权',
        `${item.method} ${item.pathTemplate} 现在需要携带 X-API-Key 才能访问。`,
        'info',
      );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
            <GlobeLock className="text-blue-500" /> 公网 API 访问控制
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            已按风险优先级排序，优先展示需要 Token 授权的 public 接口。
          </p>
        </div>
        <button
          onClick={() => void fetchAll()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
        >
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      <section className={`${cardClass} space-y-4`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="搜索 method / path / group..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <LockKeyhole size={12} />
              Token 授权 {protectedCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Globe size={12} />
              公开访问 {publicCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 dark:border-white/10 dark:bg-white/[0.05]">
              <CircleAlert size={12} />
              固定接口 {fixedCount}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            正在读取接口策略...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-white/10">
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className={`${tableHeaderCellClass} w-[110px]`}>分组</th>
                    <th className={`${tableHeaderCellClass} w-[110px]`}>Method</th>
                    <th className={`${tableHeaderCellClass} w-[42%]`}>Path</th>
                    <th className={`${tableHeaderCellClass} w-[160px] text-center whitespace-nowrap`}>
                      公开访问
                    </th>
                    <th className={`${tableHeaderCellClass} w-[170px] text-center whitespace-nowrap`}>
                      Token 授权
                    </th>
                    <th className={tableHeaderCellClass}>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400"
                      >
                        当前筛选没有命中接口。
                      </td>
                    </tr>
                  ) : (
                    filtered.map(item => {
                      const isPublicGroup = item.groupName === 'public';
                      const isSaving = savingIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            item.requireApiKey
                              ? 'bg-amber-50/55 dark:bg-amber-500/[0.06]'
                              : 'bg-transparent'
                          }`}
                        >
                          <td className={tableCellClass}>
                            <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
                              {item.groupName}
                            </span>
                          </td>
                          <td
                            className={`${tableCellClass} font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400`}
                          >
                            {item.method}
                          </td>
                          <td
                            className={`${tableCellClass} font-mono text-[11px] text-neutral-800 dark:text-neutral-200`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="break-all">{item.pathTemplate}</span>
                              {!item.publicEnabled && isPublicGroup && (
                                <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-400">
                                  未开放
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${tableCellClass} text-center`}>
                            <input
                              type="checkbox"
                              checked={item.publicEnabled}
                              disabled={!isPublicGroup || isSaving}
                              onChange={event => handlePublicToggle(item, event.target.checked)}
                              className="h-4 w-4 accent-emerald-500 disabled:cursor-not-allowed"
                              title={!isPublicGroup ? '仅 public 分组可修改公开访问' : '切换公开访问'}
                            />
                          </td>
                          <td className={`${tableCellClass} text-center`}>
                            <label
                              className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] ${
                                item.requireApiKey
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                  : 'bg-neutral-100 text-neutral-500 dark:bg-white/[0.05] dark:text-neutral-400'
                              } ${!isPublicGroup ? 'opacity-45' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={item.requireApiKey}
                                disabled={!isPublicGroup || isSaving}
                                onChange={event => handleTokenToggle(item, event.target.checked)}
                                className="h-4 w-4 accent-orange-500 disabled:cursor-not-allowed"
                              />
                              <span className="inline-flex items-center gap-1">
                                <ShieldCheck size={12} />
                                token
                              </span>
                            </label>
                          </td>
                          <td className={`${tableCellClass} text-[11px] text-neutral-500 dark:text-neutral-400`}>
                            {item.updatedAt ?? '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map(toast => {
          const toneClassName =
            toast.tone === 'error'
              ? 'border-red-200 bg-white text-red-700 shadow-red-100/60 dark:border-red-500/20 dark:bg-neutral-950 dark:text-red-300'
              : 'border-blue-200 bg-white text-blue-700 shadow-blue-100/60 dark:border-blue-500/20 dark:bg-neutral-950 dark:text-blue-300';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${toneClassName}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {toast.tone === 'error' ? <CircleAlert size={18} /> : <Info size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{toast.title}</div>
                  <div className="mt-1 text-xs leading-5 opacity-90">{toast.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
                  aria-label="关闭提示"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

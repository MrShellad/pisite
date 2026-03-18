import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { GlobeLock, ShieldCheck, Search, Save } from 'lucide-react';

type ApiEndpointPolicy = {
  id: number;
  method: string;
  pathTemplate: string;
  groupName: string;
  publicEnabled: boolean;
  requireApiKey: boolean;
  updatedAt?: string | null;
};

export default function ManageApiAccess() {
  const [items, setItems] = useState<ApiEndpointPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');

  const cardClass =
    'p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative shadow-sm dark:shadow-none';
  const inputClass =
    'w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm';

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ApiEndpointPolicy[]>('/admin/api-endpoints');
      setItems(res.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      `${i.method} ${i.pathTemplate} ${i.groupName}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const updateOne = async (id: number, patch: Partial<Pick<ApiEndpointPolicy, 'publicEnabled' | 'requireApiKey'>>) => {
    const current = items.find(i => i.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setItems(prev => prev.map(i => (i.id === id ? next : i)));
    try {
      await api.put(`/admin/api-endpoints/${id}`, {
        publicEnabled: next.publicEnabled,
        requireApiKey: next.requireApiKey,
      });
    } catch (err: any) {
      alert(err?.response?.data ?? '保存失败');
      await fetchAll();
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
          <GlobeLock className="text-blue-500" /> 公网 API 访问控制
        </h2>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/10 transition-all"
        >
          <Save size={16} /> 刷新
        </button>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="搜索 method / path / group..."
            />
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-500">
            默认：全部可公网访问；你可对单个接口设置 “必须 X-API-Key”
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-neutral-500 animate-pulse">读取中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/10 text-[11px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-2 font-medium">Group</th>
                  <th className="py-3 px-2 font-medium">Method</th>
                  <th className="py-3 px-2 font-medium">Path</th>
                  <th className="py-3 px-2 font-medium text-center">公网可访问</th>
                  <th className="py-3 px-2 font-medium text-center">必须 X-API-Key</th>
                  <th className="py-3 px-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const isPublicGroup = i.groupName === 'public';
                  return (
                    <tr key={i.id} className="border-b border-neutral-100 dark:border-white/5">
                      <td className="py-3 px-2 text-[11px] text-neutral-500">{i.groupName}</td>
                      <td className="py-3 px-2 font-mono text-[11px] text-blue-600 dark:text-blue-400">{i.method}</td>
                      <td className="py-3 px-2 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                        {i.pathTemplate}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={i.publicEnabled}
                          disabled={!isPublicGroup}
                          onChange={e => updateOne(i.id, { publicEnabled: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500"
                          title={!isPublicGroup ? '仅 public 组可配置公网开关' : ''}
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <label className={`inline-flex items-center gap-2 ${!isPublicGroup ? 'opacity-40' : ''}`}>
                          <input
                            type="checkbox"
                            checked={i.requireApiKey}
                            disabled={!isPublicGroup}
                            onChange={e => updateOne(i.id, { requireApiKey: e.target.checked })}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <span className="text-[11px] text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1">
                            <ShieldCheck size={12} /> token
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-2 text-[11px] text-neutral-500">{i.updatedAt ?? '-'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-500">
                      无匹配结果
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


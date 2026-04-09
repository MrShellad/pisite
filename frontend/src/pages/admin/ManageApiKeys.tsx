import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { KeyRound, Plus, Trash2, Activity } from 'lucide-react';

type ApiKey = {
  id: string;
  name: string;
  key: string;
  scopes?: string | null;
  rateLimitPerMinute: number;
  isActive: boolean;
  createdAt?: string | null;
  lastUsedAt?: string | null;
};

type ApiLog = {
  id: number;
  keyId?: string | null;
  path: string;
  method: string;
  status: number;
  ip?: string | null;
  createdAt?: string | null;
};

export default function ManageApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', scopes: '', rateLimitPerMinute: 60 });

  const cardClass =
    'p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative shadow-sm dark:shadow-none';
  const inputClass =
    'w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm';
  const labelClass = 'block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5';

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [k, l] = await Promise.all([
        api.get<ApiKey[]>('/admin/api-keys'),
        api.get<ApiLog[]>('/admin/api-logs'),
      ]);
      setKeys(k.data);
      setLogs(l.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post<ApiKey>('/admin/api-keys', {
        name: form.name,
        scopes: form.scopes || null,
        rateLimitPerMinute: Number(form.rateLimitPerMinute) || 0,
      });
      setForm({ name: '', scopes: '', rateLimitPerMinute: 60 });
      await fetchAll();
    } catch (err: any) {
      alert(err?.response?.data ?? '创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (key: ApiKey) => {
    await api.put(`/admin/api-keys/${key.id}`, {
      name: key.name,
      scopes: key.scopes ?? null,
      rateLimitPerMinute: key.rateLimitPerMinute,
      isActive: !key.isActive,
    });
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确认删除该 API Key？')) return;
    await api.delete(`/admin/api-keys/${id}`);
    await fetchAll();
  };

  const keyNameById = (id?: string | null) => keys.find(k => k.id === id)?.name ?? '未知 Key';

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
          <KeyRound className="text-blue-500" /> API Key 管理与访问控制
        </h2>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/10 transition-all"
        >
          <Activity size={16} /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* 左侧：创建 & 列表 */}
        <div className="space-y-6 xl:col-span-1">
          <div className={cardClass}>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-2">客户端赞助者 API</h3>
            <p className="text-xs leading-6 text-neutral-500">
              新增的公开接口 <code className="font-mono">GET /api/donors/supporters</code> 默认要求
              <code className="font-mono">X-API-Key</code>。
              在这里创建好 key 之后，客户端即可读取历史赞助者名单。
            </p>
          </div>

          <div className={cardClass}>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Plus size={16} className="text-emerald-500" /> 新建 API Key
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelClass}>名称</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                  placeholder="例如：公网伙伴 A / 内部监控"
                />
              </div>
              <div>
                <label className={labelClass}>Scopes (可选，逗号分隔 path 前缀)</label>
                <input
                  value={form.scopes}
                  onChange={e => setForm(prev => ({ ...prev, scopes: e.target.value }))}
                  className={inputClass}
                  placeholder="/api/, /api/mc/, /api/donors/"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  留空表示可以访问所有公共 API（不含 /api/admin /api/auth）。
                </p>
              </div>
              <div>
                <label className={labelClass}>每分钟限流次数</label>
                <input
                  type="number"
                  min={0}
                  value={form.rateLimitPerMinute}
                  onChange={e => setForm(prev => ({ ...prev, rateLimitPerMinute: Number(e.target.value) }))}
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-neutral-500">0 表示不启用限流。</p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? '创建中...' : '创建 Key'}
              </button>
            </form>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm">已注册的 API Keys</h3>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">{keys.length} 条</span>
            </div>
            {isLoading ? (
              <div className="py-6 text-center text-neutral-500 animate-pulse">读取中...</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {keys.map(k => (
                  <div
                    key={k.id}
                    className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] p-3 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-neutral-900 dark:text-white text-sm">{k.name}</div>
                      <button
                        onClick={() => toggleActive(k)}
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          k.isActive
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:border-white/10'
                        }`}
                      >
                        {k.isActive ? 'active' : 'disabled'}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] break-all text-neutral-600 dark:text-neutral-400">
                      {k.key}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-500 flex justify-between">
                      <span>Scopes: {k.scopes || 'ALL'}</span>
                      <span>{k.rateLimitPerMinute}/min</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-neutral-400">
                      <span>创建: {k.createdAt ?? '-'}</span>
                      <span>最近使用: {k.lastUsedAt ?? '-'}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-500/80 hover:text-red-600"
                    >
                      <Trash2 size={12} /> 删除
                    </button>
                  </div>
                ))}
                {keys.length === 0 && (
                  <div className="py-4 text-center text-neutral-500 text-xs">暂无 Key</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：访问日志 */}
        <div className={`${cardClass} xl:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-500" /> 最新访问日志（最多 500 条）
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/10 text-[11px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-2 font-medium">时间</th>
                  <th className="py-2.5 px-2 font-medium">Key</th>
                  <th className="py-2.5 px-2 font-medium">方法</th>
                  <th className="py-2.5 px-2 font-medium">路径</th>
                  <th className="py-2.5 px-2 font-medium">状态</th>
                  <th className="py-2.5 px-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-neutral-500">
                      暂无访问记录
                    </td>
                  </tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id} className="border-b border-neutral-100 dark:border-white/5">
                      <td className="py-2.5 px-2 text-[11px] text-neutral-500">{l.createdAt ?? '-'}</td>
                      <td className="py-2.5 px-2 text-[11px] text-neutral-700 dark:text-neutral-300">
                        {keyNameById(l.keyId)}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {l.method}
                      </td>
                      <td className="py-2.5 px-2 text-[11px] font-mono text-neutral-700 dark:text-neutral-200 max-w-[260px] truncate">
                        {l.path}
                      </td>
                      <td className="py-2.5 px-2 text-[11px]">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border ${
                            l.status >= 200 && l.status < 300
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : l.status >= 400
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-neutral-500">{l.ip ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


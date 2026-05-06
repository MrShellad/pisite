import { CircleAlert, X } from 'lucide-react';

export type ApiWarningItem = {
  path: string;
  method: string;
  latestStatus: number;
  errorCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  lastSeenAt?: string | null;
};

type ApiWarningsModalProps = {
  open: boolean;
  warnings: ApiWarningItem[];
  isLoading?: boolean;
  onClose: () => void;
};

export function ApiWarningsModal({ open, warnings, isLoading = false, onClose }: ApiWarningsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-white/10">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-950 dark:text-white">
              <CircleAlert className="text-amber-500" size={20} />
              接口调用预警
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              汇总最近访问日志中返回 4xx / 5xx 的接口，优先展示服务端异常和高频异常。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="关闭预警弹窗"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto p-5">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
              正在读取预警信息...
            </div>
          ) : warnings.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              暂无异常接口调用。
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
              <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400">
                    <th className="w-[90px] px-3 py-3 font-semibold">Method</th>
                    <th className="px-3 py-3 font-semibold">Path</th>
                    <th className="w-[100px] px-3 py-3 text-center font-semibold">最新状态</th>
                    <th className="w-[110px] px-3 py-3 text-center font-semibold">异常次数</th>
                    <th className="w-[110px] px-3 py-3 text-center font-semibold">5xx</th>
                    <th className="w-[150px] px-3 py-3 font-semibold">最后出现</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings.map(item => (
                    <tr key={`${item.method}:${item.path}`} className="border-b border-neutral-100 dark:border-white/5">
                      <td className="border-t border-neutral-100 px-3 py-3 font-mono font-semibold text-blue-600 dark:border-white/5 dark:text-blue-400">
                        {item.method}
                      </td>
                      <td className="border-t border-neutral-100 px-3 py-3 font-mono text-neutral-800 dark:border-white/5 dark:text-neutral-200">
                        <span className="break-all">{item.path}</span>
                      </td>
                      <td className="border-t border-neutral-100 px-3 py-3 text-center dark:border-white/5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${
                            item.latestStatus >= 500
                              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                          }`}
                        >
                          {item.latestStatus}
                        </span>
                      </td>
                      <td className="border-t border-neutral-100 px-3 py-3 text-center font-semibold text-neutral-700 dark:border-white/5 dark:text-neutral-200">
                        {item.errorCount}
                      </td>
                      <td className="border-t border-neutral-100 px-3 py-3 text-center font-semibold text-red-600 dark:border-white/5 dark:text-red-300">
                        {item.serverErrorCount}
                      </td>
                      <td className="border-t border-neutral-100 px-3 py-3 text-[11px] text-neutral-500 dark:border-white/5">
                        {item.lastSeenAt ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

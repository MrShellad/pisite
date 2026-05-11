import { useEffect, useState } from 'react';
import { BarChart2, BookOpen, Bot, Clock, Globe, RefreshCw } from 'lucide-react';

import { api, getUploadUrl } from '../../api/client';
import { useAdminFeedback } from './components/AdminFeedback';

interface McCrawlerConfig {
  id: string;
  intervalMinutes: number;
  requestCount: number;
  lastCrawlTime: string | null;
  lastCrawlStatus: string | null;
}

interface McUpdate {
  version: string;
  vType: string;
  title: string;
  cover: string;
  article: string;
  wikiEn: string;
  wikiZh: string;
  date: string;
  createdAt: string;
}

export default function ManageMcCrawler() {
  const { notify } = useAdminFeedback();
  const [config, setConfig] = useState<McCrawlerConfig | null>(null);
  const [updates, setUpdates] = useState<McUpdate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingManifest, setIsSyncingManifest] = useState(false);
  const [newInterval, setNewInterval] = useState('');

  const fetchData = async () => {
    try {
      const [confRes, updRes] = await Promise.all([
        api.get<McCrawlerConfig>('/admin/mc-crawler/config'),
        api.get<McUpdate[]>('/admin/mc-crawler/cached'),
      ]);
      setConfig(confRes.data);
      setNewInterval(confRes.data.intervalMinutes.toString());
      setUpdates(updRes.data);
    } catch (err) {
      console.error(err);
      notify('爬虫数据读取失败', '请检查网络或服务端日志。', 'error');
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleUpdateInterval = async () => {
    try {
      await api.put('/admin/mc-crawler/config', { intervalMinutes: parseInt(newInterval) || 60 });
      await fetchData();
      notify('抓取周期已更新', '新的后台抓取间隔已保存。', 'success');
    } catch (err) {
      console.error(err);
      notify('抓取周期更新失败', '请稍后重试。', 'error');
    }
  };

  const handleForceCrawl = async () => {
    setIsRefreshing(true);
    try {
      await api.post('/admin/mc-crawler/force');
      await fetchData();
      notify('强制抓取已完成', '最新版本信息已抓取。', 'success');
    } catch (err) {
      console.error(err);
      notify('强制抓取失败', '请检查后端日志。', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceSyncManifest = async () => {
    setIsSyncingManifest(true);
    try {
      await api.post('/admin/mc-crawler/force-manifest');
      notify('版本清单已同步', 'Manifest V2 游戏版本列表已更新。', 'success');
    } catch (err) {
      console.error(err);
      notify('版本清单同步失败', '请检查后端状态。', 'error');
    } finally {
      setIsSyncingManifest(false);
    }
  };

  if (!config) return <div className="animate-pulse text-neutral-500">Loading Telemetry...</div>;

  return (
    <div className="space-y-8 pb-12">
      <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
        <Bot className="text-emerald-500" /> Minecraft 资讯抓取引擎
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 flex items-center gap-3 text-neutral-500">
            <BarChart2 size={18} /> 客户端请求下发量
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white">
            {config.requestCount} <span className="text-sm font-medium text-neutral-500">次</span>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 flex items-center gap-3 text-neutral-500">
            <Clock size={18} /> 上次后台心跳时间
          </div>
          <div className="text-lg font-bold text-neutral-900 dark:text-white">
            {config.lastCrawlTime ? new Date(`${config.lastCrawlTime}Z`).toLocaleString() : '等待运行'}
          </div>
          <div className={`mt-2 text-xs font-bold ${config.lastCrawlStatus?.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
            {config.lastCrawlStatus}
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 flex items-center justify-between gap-3 text-neutral-500">
            <span className="flex items-center gap-2">
              <RefreshCw size={18} /> 轮询周期设定
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void handleForceSyncManifest()} disabled={isSyncingManifest} className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 transition hover:bg-blue-500/20 disabled:opacity-50 dark:text-blue-400">
                {isSyncingManifest ? '同步中...' : '同步版本列表'}
              </button>
              <button type="button" onClick={() => void handleForceCrawl()} disabled={isRefreshing} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400">
                {isRefreshing ? '抓取中...' : '强制抓取'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={newInterval} onChange={event => setNewInterval(event.target.value)} className="w-20 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-center font-bold dark:border-white/10 dark:bg-black/40 dark:text-white" />
            <span className="text-sm text-neutral-500">分钟/次</span>
            <button type="button" onClick={() => void handleUpdateInterval()} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
              保存
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="mt-4 flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
          <BookOpen className="text-indigo-500" /> 已缓存日志库
        </h3>

        {updates.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-neutral-200 p-10 text-center text-neutral-500 dark:border-white/10">
            暂无抓取记录，请等待定时任务执行或点击强制抓取。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {updates.map(update => (
              <div key={update.version} className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-xl dark:border-white/10 dark:bg-[#111]">
                <div className="relative h-40 overflow-hidden">
                  <img src={getUploadUrl(update.cover)} alt={update.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute left-3 top-3 rounded-md border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md">
                    {update.vType}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h4 className="text-lg font-bold leading-tight text-neutral-900 dark:text-white">{update.title}</h4>
                  <div className="mb-4 mt-2 font-mono text-xs text-neutral-500">
                    {update.date} | {update.version}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <a href={update.article} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-neutral-100 py-2 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10">
                      <Globe size={14} /> 官网原文
                    </a>
                    <a href={update.wikiZh} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">
                      <BookOpen size={14} /> 中文 Wiki
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

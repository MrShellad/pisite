// frontend/src/pages/admin/ManageMcCrawler.tsx
import { useState, useEffect } from 'react';
import { Bot, RefreshCw, BarChart2, Clock, Globe, BookOpen } from 'lucide-react';
import { api } from '../../api/client';

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
  const [config, setConfig] = useState<McCrawlerConfig | null>(null);
  const [updates, setUpdates] = useState<McUpdate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newInterval, setNewInterval] = useState('');

  const fetchData = async () => {
    try {
      const [confRes, updRes] = await Promise.all([
        api.get('/admin/mc-crawler/config'),
        api.get('/admin/mc-crawler/cached')
      ]);
      setConfig(confRes.data);
      setNewInterval(confRes.data.intervalMinutes.toString());
      setUpdates(updRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateInterval = async () => {
    try {
      await api.put('/admin/mc-crawler/config', { intervalMinutes: parseInt(newInterval) || 60 });
      alert('抓取周期更新成功！');
      fetchData();
    } catch (err) {
      alert('更新失败');
    }
  };

  const handleForceCrawl = async () => {
    setIsRefreshing(true);
    try {
      await api.post('/admin/mc-crawler/force');
      await fetchData();
    } catch (err) {
      alert('强制抓取失败，请检查后端日志');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!config) return <div className="animate-pulse text-neutral-500">Loading Telemetry...</div>;

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
        <Bot className="text-emerald-500" /> Minecraft 资讯抓取引擎 (Daemon)
      </h2>

      {/* 状态统计面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-neutral-500 mb-2"><BarChart2 size={18} />客户端请求下发量</div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white">{config.requestCount} <span className="text-sm font-medium text-neutral-500">次</span></div>
        </div>
        <div className="p-6 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-neutral-500 mb-2"><Clock size={18} />上次后台心跳时间</div>
          <div className="text-lg font-bold text-neutral-900 dark:text-white">{config.lastCrawlTime ? new Date(config.lastCrawlTime + 'Z').toLocaleString() : '等待运行'}</div>
          <div className={`text-xs mt-2 font-bold ${config.lastCrawlStatus?.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>{config.lastCrawlStatus}</div>
        </div>
        <div className="p-6 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="flex items-center gap-2"><RefreshCw size={18} /> 轮询周期设定</span>
            <button onClick={handleForceCrawl} disabled={isRefreshing} className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-bold hover:bg-emerald-500/20 disabled:opacity-50">
              {isRefreshing ? '抓取中...' : '强制抓取'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={newInterval} onChange={e => setNewInterval(e.target.value)} className="w-20 px-3 py-2 bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-lg text-center font-bold dark:text-white" />
            <span className="text-neutral-500 text-sm">分钟/次</span>
            <button onClick={handleUpdateInterval} className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors">保存</button>
          </div>
        </div>
      </div>

      {/* 抓取缓存卡片墙 (最多展示4个月) */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 mt-4">
          <BookOpen className="text-indigo-500" /> 已缓存日志库 (仅保留4个月内)
        </h3>
        
        {updates.length === 0 ? (
          <div className="p-10 text-center text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-2xl">
            暂无抓取记录，请等待定时任务执行或点击强制抓取。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {updates.map(update => (
              <div key={update.version} className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group flex flex-col">
                <div className="h-40 overflow-hidden relative">
                  <img src={`http://localhost:3000${update.cover}`} alt={update.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider rounded-md border border-white/20">
                    {update.vType}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg leading-tight text-neutral-900 dark:text-white">{update.title}</h4>
                  </div>
                  <div className="text-xs text-neutral-500 mb-4 font-mono">{update.date} | {update.version}</div>
                  
                  <div className="mt-auto flex flex-wrap gap-2">
                    <a href={update.article} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors">
                      <Globe size={14} /> 官网原文
                    </a>
                    <a href={update.wikiZh} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors">
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
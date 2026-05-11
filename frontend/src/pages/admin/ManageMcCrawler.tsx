import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  BarChart2,
  BellRing,
  BookOpen,
  Bot,
  CalendarClock,
  Clock,
  Edit3,
  ExternalLink,
  Globe,
  ImagePlus,
  Megaphone,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';

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

interface ArticlePush {
  id: string;
  title: string;
  cover: string;
  content: string;
  relatedLink: string;
  category: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

type ArticlePushForm = {
  title: string;
  cover: string;
  content: string;
  relatedLink: string;
  category: string;
  expiresAt: string;
  enabled: boolean;
};

type ActiveSection = 'push' | 'crawler';

function getDefaultBeijingExpiresAt() {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const beijingOffsetMs = 8 * 60 * 60 * 1000;
  return new Date(Date.now() + sevenDaysMs + beijingOffsetMs).toISOString().slice(0, 16);
}

function createEmptyPushForm(): ArticlePushForm {
  return {
    title: '',
    cover: '',
    content: '',
    relatedLink: '',
    category: '活动',
    expiresAt: getDefaultBeijingExpiresAt(),
    enabled: true,
  };
}

const inputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-500/10';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';

function formatDateTime(value?: string | null) {
  if (!value) return '暂无记录';
  return new Date(`${value}Z`).toLocaleString();
}

function formatBeijingDateTime(value?: string | null) {
  if (!value) return '未设置';
  return value.replace('T', ' ').slice(0, 16);
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return getDefaultBeijingExpiresAt();
  return value.replace(' ', 'T').slice(0, 16);
}

export default function ManageMcCrawler() {
  const { notify } = useAdminFeedback();
  const [activeSection, setActiveSection] = useState<ActiveSection>('push');
  const [config, setConfig] = useState<McCrawlerConfig | null>(null);
  const [updates, setUpdates] = useState<McUpdate[]>([]);
  const [pushes, setPushes] = useState<ArticlePush[]>([]);
  const [form, setForm] = useState<ArticlePushForm>(() => createEmptyPushForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingManifest, setIsSyncingManifest] = useState(false);
  const [isSavingPush, setIsSavingPush] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [newInterval, setNewInterval] = useState('');

  const enabledPushCount = useMemo(() => pushes.filter(item => item.enabled).length, [pushes]);

  const fetchCrawlerData = async () => {
    const [confRes, updRes] = await Promise.all([
      api.get<McCrawlerConfig>('/admin/mc-crawler/config'),
      api.get<McUpdate[]>('/admin/mc-crawler/cached'),
    ]);
    setConfig(confRes.data);
    setNewInterval(confRes.data.intervalMinutes.toString());
    setUpdates(updRes.data);
  };

  const fetchPushes = async () => {
    const res = await api.get<ArticlePush[]>('/admin/article-pushes?limit=200');
    setPushes(res.data);
  };

  const fetchData = async () => {
    try {
      await Promise.all([fetchCrawlerData(), fetchPushes()]);
    } catch (err) {
      console.error(err);
      notify('文章推送数据读取失败', '请检查网络或服务端日志。', 'error');
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const resetForm = () => {
    setForm(createEmptyPushForm());
    setEditingId(null);
  };

  const handlePushFieldChange = (field: keyof ArticlePushForm, value: string | boolean) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleUploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append('file', file);
    setIsUploadingCover(true);
    try {
      const response = await api.post<{ url: string }>('/admin/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      handlePushFieldChange('cover', response.data.url);
      notify('封面已上传', '活动 PUSH 封面地址已填入表单。', 'success');
    } catch (err) {
      console.error(err);
      notify('封面上传失败', '请检查图片大小或后端日志。', 'error');
    } finally {
      setIsUploadingCover(false);
      event.target.value = '';
    }
  };

  const handleSubmitPush = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingPush(true);
    try {
      const payload = {
        title: form.title.trim(),
        cover: form.cover.trim(),
        content: form.content.trim(),
        relatedLink: form.relatedLink.trim(),
        category: form.category.trim(),
        expiresAt: form.expiresAt.trim(),
        enabled: form.enabled,
      };

      if (editingId) {
        await api.put(`/admin/article-pushes/${editingId}`, payload);
        notify('活动 PUSH 已更新', '客户端将读取到更新后的内容。', 'success');
      } else {
        await api.post('/admin/article-pushes', payload);
        notify('活动 PUSH 已创建', '启用后会进入客户端公开读取列表。', 'success');
      }

      resetForm();
      await fetchPushes();
    } catch (err) {
      console.error(err);
      notify('活动 PUSH 保存失败', '请确认标题、内容、分类和过期时间已填写。', 'error');
    } finally {
      setIsSavingPush(false);
    }
  };

  const handleEditPush = (item: ArticlePush) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      cover: item.cover,
      content: item.content,
      relatedLink: item.relatedLink,
      category: item.category,
      expiresAt: toDateTimeLocalValue(item.expiresAt),
      enabled: item.enabled,
    });
  };

  const handleTogglePush = async (id: string) => {
    try {
      await api.put(`/admin/article-pushes/${id}/toggle`);
      await fetchPushes();
      notify('活动 PUSH 状态已切换', '公开读取列表会同步变化。', 'success');
    } catch (err) {
      console.error(err);
      notify('状态切换失败', '请稍后重试。', 'error');
    }
  };

  const handleDeletePush = async (id: string) => {
    if (!window.confirm('确定删除这条活动 PUSH 吗？')) return;
    try {
      await api.delete(`/admin/article-pushes/${id}`);
      if (editingId === id) resetForm();
      await fetchPushes();
      notify('活动 PUSH 已删除', '客户端将不再读取该内容。', 'success');
    } catch (err) {
      console.error(err);
      notify('活动 PUSH 删除失败', '请稍后重试。', 'error');
    }
  };

  const handleUpdateInterval = async () => {
    try {
      await api.put('/admin/mc-crawler/config', { intervalMinutes: parseInt(newInterval) || 60 });
      await fetchCrawlerData();
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
      await fetchCrawlerData();
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

  const renderSegmentButton = (section: ActiveSection, label: string, icon: JSX.Element) => (
    <button
      type="button"
      onClick={() => setActiveSection(section)}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${
        activeSection === section
          ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-950'
          : 'text-neutral-500 hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
            <Megaphone className="text-orange-500" /> 文章推送
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
            管理客户端可读取的运营文章、活动 PUSH，以及 Minecraft 官方资讯抓取缓存。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-white/10 dark:bg-black/30">
          {renderSegmentButton('push', '活动 PUSH', <BellRing size={16} />)}
          {renderSegmentButton('crawler', 'Minecraft 抓取', <Bot size={16} />)}
        </div>
      </div>

      {activeSection === 'push' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,420px)_1fr]">
          <form onSubmit={handleSubmitPush} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {editingId ? '编辑活动 PUSH' : '新建活动 PUSH'}
                </h3>
                <p className="mt-1 text-xs text-neutral-500">公开接口：/api/article-pushes</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600 transition hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10"
              >
                新建
              </button>
            </div>

            <div>
              <label className={labelClass}>标题</label>
              <input value={form.title} onChange={event => handlePushFieldChange('title', event.target.value)} className={inputClass} placeholder="例如：夏季联机活动开启" />
            </div>

            <div>
              <label className={labelClass}>封面</label>
              <div className="flex gap-2">
                <input value={form.cover} onChange={event => handlePushFieldChange('cover', event.target.value)} className={inputClass} placeholder="/uploads/admin/..." />
                <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">
                  <ImagePlus size={16} />
                  {isUploadingCover ? '上传中' : '上传'}
                  <input type="file" accept="image/*" onChange={event => void handleUploadCover(event)} className="hidden" />
                </label>
              </div>
              {form.cover ? (
                <img src={getUploadUrl(form.cover)} alt="" className="mt-3 aspect-video w-full rounded-lg object-cover" />
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>分类</label>
                <input value={form.category} onChange={event => handlePushFieldChange('category', event.target.value)} className={inputClass} placeholder="活动 / 公告 / 福利" />
              </div>
              <div>
                <label className={labelClass}>相关链接</label>
                <input value={form.relatedLink} onChange={event => handlePushFieldChange('relatedLink', event.target.value)} className={inputClass} placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className={labelClass}>过期时间（北京时间）</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={event => handlePushFieldChange('expiresAt', event.target.value)}
                className={inputClass}
                required
              />
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                到期后服务端会自动删除这条 PUSH 和未被其它 PUSH 使用的本地封面。
              </p>
            </div>

            <div>
              <label className={labelClass}>内容</label>
              <textarea
                value={form.content}
                onChange={event => handlePushFieldChange('content', event.target.value)}
                className={`${inputClass} min-h-36 resize-y leading-6`}
                placeholder="填写客户端展示的 PUSH 内容"
              />
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={event => handlePushFieldChange('enabled', event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-orange-500 focus:ring-orange-400"
              />
              启用后进入客户端 PUSH 列表
            </label>

            <button
              type="submit"
              disabled={isSavingPush}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isSavingPush ? '保存中...' : editingId ? '保存修改' : '发布 PUSH'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-neutral-500">总 PUSH</p>
                <p className="mt-2 text-3xl font-black text-neutral-900 dark:text-white">{pushes.length}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-neutral-500">已启用</p>
                <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{enabledPushCount}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-neutral-500">最新更新</p>
                <p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{formatDateTime(pushes[0]?.updatedAt ?? pushes[0]?.createdAt)}</p>
              </div>
            </div>

            {pushes.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-neutral-200 p-10 text-center text-neutral-500 dark:border-white/10">
                暂无活动 PUSH，左侧创建第一条内容。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {pushes.map(item => (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111]">
                    {item.cover ? <img src={getUploadUrl(item.cover)} alt={item.title} className="aspect-video w-full object-cover" /> : null}
                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-orange-500/10 px-2 py-1 text-[11px] font-black text-orange-600 dark:text-orange-400">{item.category}</span>
                            <span className={`rounded-md px-2 py-1 text-[11px] font-black ${item.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-200 text-neutral-500 dark:bg-white/10'}`}>
                              {item.enabled ? '已启用' : '已停用'}
                            </span>
                          </div>
                          <h4 className="line-clamp-2 text-lg font-bold leading-tight text-neutral-900 dark:text-white">{item.title}</h4>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{item.content}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                        <Clock size={14} />
                        {formatDateTime(item.createdAt)}
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={14} />
                          过期：{formatBeijingDateTime(item.expiresAt)}
                        </span>
                        {item.relatedLink ? (
                          <a href={item.relatedLink} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            相关链接 <ExternalLink size={13} />
                          </a>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => handleEditPush(item)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-100 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10">
                          <Edit3 size={14} /> 编辑
                        </button>
                        <button type="button" onClick={() => void handleTogglePush(item.id)} className="rounded-lg bg-emerald-500/10 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400">
                          {item.enabled ? '停用' : '启用'}
                        </button>
                        <button type="button" onClick={() => void handleDeletePush(item.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-2 text-xs font-bold text-red-600 transition hover:bg-red-500/20 dark:text-red-400">
                          <Trash2 size={14} /> 删除
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {!config ? (
            <div className="animate-pulse text-neutral-500">Loading Telemetry...</div>
          ) : (
            <>
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
                  <div className="text-lg font-bold text-neutral-900 dark:text-white">{formatDateTime(config.lastCrawlTime)}</div>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

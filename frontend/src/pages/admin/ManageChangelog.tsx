import { useEffect, useMemo, useState } from 'react';
import {
  FileSignature,
  GitCommit,
  Globe,
  Percent,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, getUploadUrl } from '../../api/client';

type PlatformKey = 'darwin' | 'windows' | 'linux';
type ReleaseChannel = 'stable' | 'preview' | 'beta';
type RolloutType = 'all' | 'grayscale' | 'targeted';

type PlatformAsset = {
  url: string;
  signature: string;
};

type ChangeDraft = {
  iconSvg: string;
  iconColor: string;
  text: string;
};

type PublishForm = {
  versionId: string;
  displayVersion: string;
  date: string;
  channel: ReleaseChannel;
  rolloutType: RolloutType;
  rolloutValue: string;
  allowedRegions: string;
  platforms: Record<PlatformKey, PlatformAsset>;
  changes: ChangeDraft[];
};

type ReleaseLog = {
  id: string;
  version: string;
  versionId?: string;
  displayVersion?: string;
  date: string;
  channel: string;
  rolloutType: string;
  rolloutValue: string;
  allowedRegions?: string;
  status: string;
  changes: ChangeDraft[];
  platforms?: Partial<Record<PlatformKey, Partial<PlatformAsset>>>;
};

const PRESET_ICONS = [
  {
    name: 'Feature',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    color: '#3b82f6',
  },
  {
    name: 'Bugfix',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/></svg>',
    color: '#ef4444',
  },
  {
    name: 'Performance',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    color: '#eab308',
  },
  {
    name: 'Security',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    color: '#10b981',
  },
  {
    name: 'UI/UX',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    color: '#8b5cf6',
  },
];

const platformLabels: Record<PlatformKey, string> = {
  darwin: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

const emptyChange: ChangeDraft = {
  iconSvg: PRESET_ICONS[0].svg,
  iconColor: PRESET_ICONS[0].color,
  text: '',
};

const createInitialForm = (): PublishForm => ({
  versionId: '',
  displayVersion: '',
  date: new Date().toISOString().slice(0, 10),
  channel: 'stable',
  rolloutType: 'all',
  rolloutValue: '',
  allowedRegions: 'ALL',
  platforms: {
    darwin: { url: '', signature: '' },
    windows: { url: '', signature: '' },
    linux: { url: '', signature: '' },
  },
  changes: [{ ...emptyChange }],
});

function parseSigFromText(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed) as { signature?: string; sig?: string } | string;
    if (typeof parsed === 'string') return parsed.trim();
    if (typeof parsed.signature === 'string' && parsed.signature.trim()) {
      return parsed.signature.trim();
    }
    if (typeof parsed.sig === 'string' && parsed.sig.trim()) {
      return parsed.sig.trim();
    }
  } catch {
    // not json, keep parsing by line below
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('untrusted comment:') && !line.startsWith('trusted comment:'));

  const likelySig = lines.find(line => /^[A-Za-z0-9+/=_-]{40,}$/.test(line));
  if (likelySig) return likelySig;

  return lines[0] ?? trimmed;
}

export default function ManageChangelog() {
  const [logs, setLogs] = useState<ReleaseLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPackage, setIsUploadingPackage] = useState<Record<PlatformKey, boolean>>({
    darwin: false,
    windows: false,
    linux: false,
  });
  const [isUploadingSig, setIsUploadingSig] = useState<Record<PlatformKey, boolean>>({
    darwin: false,
    windows: false,
    linux: false,
  });
  const [isPushing, setIsPushing] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<PublishForm>(() => createInitialForm());

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-neutral-600 dark:focus:bg-blue-500/5';
  const labelClass = 'mb-1.5 ml-1 block text-xs font-bold text-neutral-500 dark:text-neutral-400';
  const cardClass =
    'mb-6 rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';

  const firstTargetUuid = useMemo(() => {
    if (formData.rolloutType !== 'targeted') return '';
    const list = formData.rolloutValue
      .split(/[,\s]+/)
      .map(item => item.trim())
      .filter(Boolean);
    return list[0] ?? '';
  }, [formData.rolloutType, formData.rolloutValue]);

  const fetchLogs = async () => {
    const response = await api.get<ReleaseLog[]>('/admin/changelog');
    setLogs(response.data);
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const updatePlatformField = (platform: PlatformKey, field: keyof PlatformAsset, value: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: {
          ...prev.platforms[platform],
          [field]: value,
        },
      },
    }));
  };

  const handlePackageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: PlatformKey,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsUploadingPackage(prev => ({ ...prev, [platform]: true }));
    const body = new FormData();
    body.append('file', file);

    try {
      const response = await api.post<{ url: string }>('/admin/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updatePlatformField(platform, 'url', getUploadUrl(response.data.url));
    } catch (error: any) {
      alert(error?.response?.data ?? '安装包上传失败，请重试。');
    } finally {
      setIsUploadingPackage(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: PlatformKey,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsUploadingSig(prev => ({ ...prev, [platform]: true }));
    try {
      const content = await file.text();
      const parsed = parseSigFromText(content);
      if (!parsed) {
        alert('.sig 文件解析为空，请检查文件内容。');
        return;
      }
      updatePlatformField(platform, 'signature', parsed);
    } catch {
      alert('读取 .sig 文件失败，请重试。');
    } finally {
      setIsUploadingSig(prev => ({ ...prev, [platform]: false }));
    }
  };

  const addChange = () => {
    setFormData(prev => ({
      ...prev,
      changes: [...prev.changes, { ...emptyChange }],
    }));
  };

  const updateChange = (index: number, field: keyof ChangeDraft, value: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const applyPreset = (index: number, svg: string, color: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, iconSvg: svg, iconColor: color } : item,
      ),
    }));
  };

  const removeChange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/changelog', formData);
      await fetchLogs();
      setFormData(createInitialForm());
      alert('版本发布成功。');
    } catch (error: any) {
      alert(error?.response?.data ?? '发布失败，请检查输入后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollback = async (id: string) => {
    if (!window.confirm('确认回滚该版本吗？')) return;
    try {
      await api.post(`/admin/changelog/${id}/rollback`);
      await fetchLogs();
    } catch (error: any) {
      alert(error?.response?.data ?? '回滚失败。');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确认删除该版本记录吗？此操作不可撤销。')) return;
    try {
      await api.delete(`/admin/changelog/${id}`);
      await fetchLogs();
    } catch (error: any) {
      alert(error?.response?.data ?? '删除失败。');
    }
  };

  const handlePushDownload = async (releaseId: string, platform: 'windows' | 'linux') => {
    const key = `${releaseId}-${platform}`;
    setIsPushing(prev => ({ ...prev, [key]: true }));
    try {
      const response = await api.post<{
        platform: string;
        url: string;
        displayVersion: string;
      }>(`/admin/changelog/${releaseId}/push-hero-download`, { platform });
      alert(
        `已将 ${response.data.displayVersion} 的 ${platformLabels[platform]} 下载地址推送到首页按钮。`,
      );
    } catch (error: any) {
      alert(error?.response?.data ?? '推送到首页下载按钮失败。');
    } finally {
      setIsPushing(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
          <GitCommit className="text-blue-500" /> 版本发布与分发中心
        </h2>
        <button
          type="button"
          onClick={() => void fetchLogs()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
        >
          <RefreshCcw size={15} /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:h-[calc(100vh-13rem)] xl:grid-cols-2">
        <div className="xl:min-h-0 xl:overflow-y-auto xl:pr-2">
          <form onSubmit={handleSubmit}>
            <div className={cardClass}>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                <Plus size={16} className="text-blue-500" /> 基础版本信息
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>版本号 (SemVer)</label>
                  <input
                    required
                    value={formData.versionId}
                    onChange={event => setFormData(prev => ({ ...prev, versionId: event.target.value }))}
                    className={inputClass}
                    placeholder="1.2.0"
                  />
                </div>
                <div>
                  <label className={labelClass}>发布日期</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={event => setFormData(prev => ({ ...prev, date: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>展示版本名</label>
                  <input
                    required
                    value={formData.displayVersion}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, displayVersion: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="v1.2.0 Beta"
                  />
                </div>
                <div>
                  <label className={labelClass}>发布通道</label>
                  <select
                    value={formData.channel}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, channel: event.target.value as ReleaseChannel }))
                    }
                    className={inputClass}
                  >
                    <option value="stable">Stable (正式)</option>
                    <option value="preview">Preview (预览)</option>
                    <option value="beta">Beta (测试)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                <ShieldCheck size={16} className="text-emerald-500" /> 构建产物与签名
              </h3>
              <div className="space-y-5">
                {(Object.keys(platformLabels) as PlatformKey[]).map(platform => (
                  <div
                    key={platform}
                    className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-black/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-neutral-900 capitalize dark:text-white">
                        {platformLabels[platform]}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 transition-all hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10">
                          {isUploadingPackage[platform] ? (
                            '上传中...'
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Upload size={13} /> 上传安装包
                            </span>
                          )}
                          <input
                            type="file"
                            accept=".zip,.tar.gz,.msi,.dmg,.AppImage,.exe"
                            className="hidden"
                            onChange={event => void handlePackageUpload(event, platform)}
                            disabled={isUploadingPackage[platform]}
                          />
                        </label>
                        <label className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 transition-all hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10">
                          {isUploadingSig[platform] ? (
                            '解析中...'
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <FileSignature size={13} /> 导入 .sig
                            </span>
                          )}
                          <input
                            type="file"
                            accept=".sig,.txt,.json"
                            className="hidden"
                            onChange={event => void handleSignatureUpload(event, platform)}
                            disabled={isUploadingSig[platform]}
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      value={formData.platforms[platform].url}
                      onChange={event => updatePlatformField(platform, 'url', event.target.value)}
                      className={inputClass}
                      placeholder="安装包 URL"
                    />
                    <input
                      value={formData.platforms[platform].signature}
                      onChange={event =>
                        updatePlatformField(platform, 'signature', event.target.value)
                      }
                      className={`${inputClass} font-mono text-xs`}
                      placeholder=".sig 签名内容"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                <Target size={16} className="text-purple-500" /> 高级发布策略
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rolloutType: 'all' }))}
                    className={`rounded-lg border py-2 text-xs font-bold ${
                      formData.rolloutType === 'all'
                        ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'border-neutral-200 text-neutral-500 dark:border-white/10 dark:text-neutral-400'
                    }`}
                  >
                    <Globe size={14} className="mr-1 inline" /> 全量
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rolloutType: 'grayscale' }))}
                    className={`rounded-lg border py-2 text-xs font-bold ${
                      formData.rolloutType === 'grayscale'
                        ? 'border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-300'
                        : 'border-neutral-200 text-neutral-500 dark:border-white/10 dark:text-neutral-400'
                    }`}
                  >
                    <Percent size={14} className="mr-1 inline" /> 灰度
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rolloutType: 'targeted' }))}
                    className={`rounded-lg border py-2 text-xs font-bold ${
                      formData.rolloutType === 'targeted'
                        ? 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-300'
                        : 'border-neutral-200 text-neutral-500 dark:border-white/10 dark:text-neutral-400'
                    }`}
                  >
                    <Users size={14} className="mr-1 inline" /> 特定 UUID
                  </button>
                </div>

                {formData.rolloutType === 'grayscale' ? (
                  <div>
                    <label className={labelClass}>灰度百分比 (1-100)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.rolloutValue}
                      onChange={event =>
                        setFormData(prev => ({ ...prev, rolloutValue: event.target.value }))
                      }
                      className={inputClass}
                      placeholder="30"
                    />
                  </div>
                ) : null}

                {formData.rolloutType === 'targeted' ? (
                  <div className="space-y-2">
                    <label className={labelClass}>目标设备 UUID 列表 (逗号分隔)</label>
                    <textarea
                      value={formData.rolloutValue}
                      onChange={event =>
                        setFormData(prev => ({ ...prev, rolloutValue: event.target.value }))
                      }
                      className={`${inputClass} h-20`}
                      placeholder="uuid-1, uuid-2"
                    />
                    {firstTargetUuid ? (
                      <Link
                        to={`/admin/donors?uuid=${encodeURIComponent(firstTargetUuid)}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        按 {firstTargetUuid} 前往捐赠列表筛选
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>允许地区 (ALL 或 ISO 代码)</label>
                  <input
                    value={formData.allowedRegions}
                    onChange={event =>
                      setFormData(prev => ({ ...prev, allowedRegions: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="ALL 或 CN,US,JP"
                  />
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 dark:text-white">更新日志详情</h3>
              </div>

              {formData.changes.map((item, index) => (
                <div
                  key={index}
                  className="relative mb-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <input
                      type="color"
                      value={item.iconColor}
                      onChange={event => updateChange(index, 'iconColor', event.target.value)}
                      className="h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded border-0 p-0"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        value={item.iconSvg}
                        onChange={event => updateChange(index, 'iconSvg', event.target.value)}
                        className={`${inputClass} py-2 font-mono text-[11px]`}
                        placeholder="SVG 内容"
                      />
                      <input
                        value={item.text}
                        onChange={event => updateChange(index, 'text', event.target.value)}
                        className={inputClass}
                        placeholder="变更描述"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChange(index)}
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-12">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                      预设图标
                    </span>
                    {PRESET_ICONS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(index, preset.svg, preset.color)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white transition-all hover:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500"
                        title={preset.name}
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: preset.svg }}
                          className="h-3.5 w-3.5"
                          style={{ color: preset.color }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addChange}
                className="mt-1 w-full rounded-lg border border-dashed border-neutral-300 py-2 text-xs font-bold text-neutral-500 transition-all hover:border-blue-500/50 hover:text-blue-500 dark:border-white/20 dark:text-neutral-400"
              >
                + 添加更新条目
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              <Send size={16} />
              {isSubmitting ? '发布中...' : '确认发布'}
            </button>
          </form>
        </div>

        <div className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-2">
          <h3 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">版本控制区</h3>
          {logs.map(log => (
            <div
              key={log.id}
              className={`relative rounded-2xl border p-5 shadow-sm ${
                log.status === 'rollback'
                  ? 'border-red-300/50 bg-red-50/50 opacity-75 dark:border-red-500/30 dark:bg-red-500/5'
                  : 'border-neutral-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-white/5">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xl font-black text-neutral-900 dark:text-white">
                      {log.version}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        log.channel === 'preview'
                          ? 'bg-purple-100 text-purple-600'
                          : log.channel === 'beta'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {log.channel}
                    </span>
                    {log.status === 'rollback' ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        已回滚
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-500">
                    <span>{log.date}</span>
                    <span>|</span>
                    <span>
                      策略: {log.rolloutType} {log.rolloutValue || '-'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {log.status !== 'rollback' ? (
                    <button
                      type="button"
                      onClick={() => void handleRollback(log.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-100"
                    >
                      回滚
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDelete(log.id)}
                    className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    title="删除版本记录"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(['windows', 'linux'] as const).map(platform => {
                  const hasUrl = Boolean(log.platforms?.[platform]?.url);
                  const key = `${log.id}-${platform}`;
                  return (
                    <button
                      key={platform}
                      type="button"
                      disabled={!hasUrl || isPushing[key] || log.status === 'rollback'}
                      onClick={() => void handlePushDownload(log.id, platform)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-neutral-700 transition-all hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                    >
                      <Send size={12} />
                      {isPushing[key]
                        ? '推送中...'
                        : `推送 ${platformLabels[platform]} 到首页下载按钮`}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 opacity-90">
                {log.changes?.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                  >
                    <span
                      style={{ color: item.iconColor }}
                      dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                      className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                    />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {logs.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-neutral-100 py-20 text-center text-neutral-400 dark:border-white/5">
              <GitCommit className="mx-auto mb-2 opacity-20" size={48} />
              <p className="text-sm">暂无已发布版本记录</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

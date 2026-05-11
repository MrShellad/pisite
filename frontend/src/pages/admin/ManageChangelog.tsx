import { useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  FileSignature,
  GitCommit,
  Globe,
  Package,
  Percent,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { PRESET_ICONS, platformLabels } from './changelog/constants';
import { useManageChangelog } from './changelog/hooks/useManageChangelog';
import type { PlatformKey, ReleaseChannel } from './changelog/types';
import { formatFileSize } from './changelog/utils';

export default function ManageChangelog() {
  const {
    logs,
    packageAssets,
    isPackageManagerOpen,
    setIsPackageManagerOpen,
    isManualUploading,
    isSubmitting,
    isUploadingPackage,
    isUploadingSig,
    uploadProgress,
    isPushing,
    formData,
    setFormData,
    firstTargetUuid,
    fetchLogs,
    fetchPackageAssets,
    updatePlatformField,
    cancelPackageUpload,
    handlePackageUpload,
    handleManualPackageUpload,
    copyDownloadLink,
    renamePackageAsset,
    deletePackageAsset,
    handleSignatureUpload,
    addChange,
    updateChange,
    applyPreset,
    removeChange,
    handleSubmit,
    handleRollback,
    handleDelete,
    handlePushDownload,
  } = useManageChangelog();
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const selectedIconChange = iconPickerIndex === null ? null : formData.changes[iconPickerIndex] ?? null;

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-neutral-600 dark:focus:bg-blue-500/5';
  const labelClass = 'mb-1.5 ml-1 block text-xs font-bold text-neutral-500 dark:text-neutral-400';
  const cardClass =
    'mb-6 rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';
  return (
    <div className="w-full space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
          <GitCommit className="text-blue-500" /> 版本分发
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsPackageManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
          >
            <Package size={15} /> 历史安装包管理
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700">
            <Upload size={15} />
            {isManualUploading ? '上传中...' : '手动上传安装包'}
            <input
              type="file"
              className="hidden"
              onChange={event => void handleManualPackageUpload(event)}
              disabled={isManualUploading}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              void fetchLogs();
              void fetchPackageAssets();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-4 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
          >
            <RefreshCcw size={15} /> 刷新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 2xl:h-[calc(100vh-13rem)] 2xl:grid-cols-2">
        <div className="2xl:min-h-0 2xl:overflow-y-auto 2xl:pr-2">
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
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setIconPickerIndex(index)}
                      className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                      title="选择图标"
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                        className="h-5 w-5 transition-transform group-hover:scale-110"
                        style={{ color: item.iconColor }}
                      />
                    </button>
                    <div className="flex-1">
                      <input
                        value={item.text}
                        onChange={event => updateChange(index, 'text', event.target.value)}
                        className={inputClass}
                        placeholder="变更描述"
                      />
                      <button
                        type="button"
                        onClick={() => setIconPickerIndex(index)}
                        className="mt-2 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        选择预设图标
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChange(index)}
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
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

        <div className="space-y-4 2xl:min-h-0 2xl:overflow-y-auto 2xl:pr-2">
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

      {iconPickerIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  选择更新图标
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  从预设图标中选择，图标样式和颜色会自动匹配。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIconPickerIndex(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="关闭图标选择器"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto p-5">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {PRESET_ICONS.map(preset => {
                  const isSelected =
                    selectedIconChange?.iconSvg === preset.svg &&
                    selectedIconChange?.iconColor === preset.color;

                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        applyPreset(iconPickerIndex, preset.svg, preset.color);
                        setIconPickerIndex(null);
                      }}
                      className={`group flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200'
                          : 'border-neutral-200 bg-neutral-50/70 text-neutral-600 hover:border-blue-300 hover:bg-white hover:text-blue-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300 dark:hover:border-blue-400 dark:hover:bg-white/[0.06] dark:hover:text-blue-300'
                      }`}
                    >
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm transition-transform group-hover:scale-105 dark:bg-white/5"
                        style={{ color: preset.color }}
                      >
                        <span
                          dangerouslySetInnerHTML={{ __html: preset.svg }}
                          className="h-5 w-5"
                        />
                      </span>
                      <span className="text-xs font-bold">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {uploadProgress ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <Upload size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  {uploadProgress.title}
                </h3>
                <p className="mt-1 truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {uploadProgress.fileName}
                </p>
              </div>
              <div className="text-lg font-black tabular-nums text-blue-600 dark:text-blue-300">
                {uploadProgress.percent}%
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200 ease-out dark:bg-blue-400"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              <span>{formatFileSize(uploadProgress.loaded)}</span>
              <span>{formatFileSize(uploadProgress.total)}</span>
            </div>

            <button
              type="button"
              onClick={cancelPackageUpload}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            >
              <X size={16} />
              取消上传
            </button>
          </div>
        </div>
      ) : null}

      {isPackageManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-white/10">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-neutral-900 dark:text-white">
                  <Package size={18} className="text-blue-500" />
                  历史安装包管理
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  安装包按上传日期存放，复制链接会使用站点设置中的网站域名和公开下载入口。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
                  <Upload size={15} />
                  {isManualUploading ? '上传中...' : '上传安装包'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={event => void handleManualPackageUpload(event)}
                    disabled={isManualUploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setIsPackageManagerOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="关闭"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {packageAssets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                  暂无历史安装包。
                </div>
              ) : (
                <div className="space-y-3">
                  {packageAssets.map(asset => (
                    <div
                      key={`${asset.date}/${asset.fileName}`}
                      className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            {asset.date}
                          </span>
                          <span className="text-xs font-semibold text-neutral-500">
                            {formatFileSize(asset.sizeBytes)}
                          </span>
                        </div>
                        <div className="mt-2 truncate font-mono text-sm font-bold text-neutral-900 dark:text-white">
                          {asset.fileName}
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          {asset.downloadUrl}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <a
                          href={asset.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                        >
                          <Download size={14} /> 打开
                        </a>
                        <button
                          type="button"
                          onClick={() => void copyDownloadLink(asset.downloadUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                        >
                          <Copy size={14} /> 复制链接
                        </button>
                        <button
                          type="button"
                          onClick={() => void renamePackageAsset(asset)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                        >
                          <Edit3 size={14} /> 重命名
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePackageAsset(asset)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        >
                          <Trash2 size={14} /> 删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

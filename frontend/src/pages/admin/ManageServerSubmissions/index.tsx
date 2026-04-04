import {
  CheckCircle2,
  Circle,
  Clock3,
  ImagePlus,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { getUploadUrl } from '@/api/client';
import IconTagEditor from '@/pages/ServerSubmission/components/IconTagEditor';
import StringTagEditor from '@/pages/ServerSubmission/components/StringTagEditor';
import { useManageServerSubmissions } from './useManageServerSubmissions';

export default function ManageServerSubmissions() {
  const {
    filteredSubmissions,
    selectedId,
    formData,
    setFormData,
    isLoading,
    setIsLoading,
    isSaving,
    isUploading,
    isSavingPingConfig,
    isRunningPingJob,
    tagDict,
    pingConfig,
    updatePingConfigField,
    handleSavePingConfig,
    handleRunPingBatch,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    fetchData,
    handleSelect,
    handleUpload,
    handleSave,
    handleDelete,
    handleToggleVerify,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
  } = useManageServerSubmissions();

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:bg-white';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500';
  const cardClass = 'rounded-2xl border border-neutral-200/70 bg-white/85 p-6 shadow-sm backdrop-blur';

  if (isLoading) {
    return <div className="animate-pulse p-8 text-neutral-500">Loading submissions...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Server className="text-orange-500" />
            服务器提交管理
          </h2>
          <p className="mt-2 text-sm text-neutral-500">审核、编辑并维护服务器提交内容与在线状态缓存。</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="group relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-orange-500"
            />
            <input
              type="text"
              placeholder="搜索名称或 IP"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
            />
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              void fetchData();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <section className={`${cardClass} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Clock3 size={16} className="text-orange-500" />
              Server List Ping 计划任务
            </h3>
            <p className="mt-1 text-xs text-neutral-500">支持开关、分批抓取、TTL 过期和手动触发。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleRunPingBatch()}
              disabled={isRunningPingJob}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
            >
              {isRunningPingJob ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              手动执行一批
            </button>
            <button
              onClick={() => void handleSavePingConfig()}
              disabled={!pingConfig || isSavingPingConfig}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isSavingPingConfig ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              保存计划
            </button>
          </div>
        </div>

        {pingConfig && (
          <div className="mt-4 grid gap-4 sm:grid-cols-5">
            <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">
              <input
                type="checkbox"
                checked={pingConfig.enabled}
                onChange={(e) => updatePingConfigField('enabled', e.target.checked)}
                className="h-4 w-4 accent-orange-500"
              />
              启用任务
            </label>
            <label className="text-xs text-neutral-600">
              间隔(秒)
              <input
                type="number"
                min={10}
                value={pingConfig.intervalSeconds}
                onChange={(e) => updatePingConfigField('intervalSeconds', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500"
              />
            </label>
            <label className="text-xs text-neutral-600">
              批次大小
              <input
                type="number"
                min={1}
                value={pingConfig.batchSize}
                onChange={(e) => updatePingConfigField('batchSize', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500"
              />
            </label>
            <label className="text-xs text-neutral-600">
              超时(ms)
              <input
                type="number"
                min={500}
                value={pingConfig.timeoutMs}
                onChange={(e) => updatePingConfigField('timeoutMs', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500"
              />
            </label>
            <label className="text-xs text-neutral-600">
              TTL(秒)
              <input
                type="number"
                min={10}
                value={pingConfig.ttlSeconds}
                onChange={(e) => updatePingConfigField('ttlSeconds', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-orange-500"
              />
            </label>
          </div>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
        <section className={`${cardClass} flex h-[calc(100vh-180px)] flex-col overflow-hidden`}>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex rounded-xl bg-neutral-100 p-1">
              {(['all', 'pending', 'verified'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    filterStatus === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {s === 'all' ? '全部' : s === 'pending' ? '待审' : '已审'}
                </button>
              ))}
            </div>
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">{filteredSubmissions.length}</span>
          </div>

          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-2">
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">暂无记录</div>
            ) : (
              filteredSubmissions.map((item) => {
                const isActive = item.id === selectedId;
                const hasFreshStatus = !!item.statusUpdatedAt && !item.statusIsExpired;
                const statusOnline = hasFreshStatus ? !!item.statusIsOnline : false;
                const onlinePlayers = hasFreshStatus
                  ? (item.statusOnlinePlayers ?? item.onlinePlayers ?? 0)
                  : (item.onlinePlayers ?? 0);
                const maxPlayers = hasFreshStatus
                  ? (item.statusMaxPlayers ?? item.maxPlayers ?? 0)
                  : (item.maxPlayers ?? 0);

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl border transition-all ${
                      isActive
                        ? 'border-orange-300 bg-orange-50/50'
                        : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'
                    }`}
                  >
                    <button onClick={() => handleSelect(item)} className="w-full px-4 py-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <img
                            src={getUploadUrl(item.icon) || '/placeholder-icon.png'}
                            className="h-10 w-10 rounded-xl border border-neutral-200 object-cover"
                            alt=""
                          />
                          <div>
                            <div className="line-clamp-1 text-sm font-bold text-neutral-900">{item.name || '未命名'}</div>
                            <div className="mt-1 font-mono text-xs text-neutral-500">{item.ip}:{item.port}</div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
                              <span className={`inline-block h-2 w-2 rounded-full ${statusOnline ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                              <span>{statusOnline ? '在线' : '离线/过期'}</span>
                              <span className="font-mono">{onlinePlayers}/{maxPlayers}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleVerify(item.id, item.verified);
                        }}
                        className={`rounded-lg p-2 transition-colors ${
                          item.verified ? 'text-emerald-500 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'
                        }`}
                        title={item.verified ? '撤销审核' : '标记通过'}
                      >
                        {item.verified ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(item.id);
                        }}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={`${cardClass} custom-scrollbar h-[calc(100vh-180px)] overflow-y-auto`}>
          {!formData ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-neutral-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                <Server size={32} />
              </div>
              <p className="text-sm font-medium">请在左侧选择一条记录后再编辑。</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-5 backdrop-blur-md">
                <div>
                  <h4 className="text-sm font-bold text-orange-800">审核控制</h4>
                  <p className="mt-1 text-xs text-orange-600">审核通过后可在公开列表展示。</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedId) {
                        void handleToggleVerify(selectedId, formData.verified);
                      }
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                      formData.verified
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-orange-200 bg-white text-orange-700'
                    }`}
                  >
                    {formData.verified ? <ShieldCheck size={18} /> : <Circle size={18} />}
                    {formData.verified ? '已通过' : '设为待审'}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-600">
                    <input
                      type="checkbox"
                      checked={formData.verified}
                      onChange={(e) =>
                        setFormData((prev) => (prev ? { ...prev, verified: e.target.checked } : prev))
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />
                    手动切换
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>服务器图标</label>
                  <label className="group relative block h-24 w-24 cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-neutral-200 bg-neutral-50 transition-all hover:border-orange-500 hover:bg-white">
                    {formData.icon ? (
                      <img src={formData.icon} className="h-full w-full object-cover" alt="icon" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImagePlus size={24} className="text-neutral-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload size={18} />
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUpload(e, 'icon')}
                      disabled={!!isUploading}
                      accept="image/*"
                    />
                  </label>
                </div>

                <div>
                  <label className={labelClass}>Hero 封面</label>
                  <label className="group relative block h-24 w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 transition-all hover:border-orange-500 hover:bg-white">
                    {formData.hero ? (
                      <img src={formData.hero} className="h-full w-full object-cover" alt="hero" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImagePlus size={24} className="text-neutral-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload size={18} />
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUpload(e, 'hero')}
                      disabled={!!isUploading}
                      accept="image/*"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>服务器名称</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>服务器类型</label>
                  <select
                    value={formData.serverType}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, serverType: e.target.value } : prev))
                    }
                    className={inputClass}
                  >
                    <option value="vanilla">vanilla</option>
                    <option value="plugin">plugin</option>
                    <option value="modded">modded</option>
                    <option value="network">network</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>语言</label>
                  <input
                    value={formData.language}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, language: e.target.value } : prev))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>详情介绍</label>
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors focus-within:border-orange-500">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(val) =>
                      setFormData((prev) => (prev ? { ...prev, description: val } : prev))
                    }
                    className="min-h-[220px] border-0 pb-12"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>IP / 域名</label>
                  <input
                    value={formData.ip}
                    onChange={(e) => setFormData((prev) => (prev ? { ...prev, ip: e.target.value } : prev))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>端口</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, port: Number(e.target.value) } : prev))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>最大人数</label>
                  <input
                    type="number"
                    value={formData.maxPlayers}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, maxPlayers: Number(e.target.value) } : prev))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>兼容版本</label>
                  <StringTagEditor
                    tags={formData.versions}
                    validateRegex={/^\d+\.\d+(\.\d+)?(-\w+)?$/}
                    onChange={(tags) => setFormData((prev) => (prev ? { ...prev, versions: tags } : prev))}
                  />
                </div>
                <div>
                  <label className={labelClass}>标签</label>
                  <StringTagEditor
                    tags={formData.tags}
                    onChange={(tags) => setFormData((prev) => (prev ? { ...prev, tags } : prev))}
                  />
                </div>
              </div>

              <div className="grid items-end gap-6 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>年龄建议</label>
                  <select
                    value={formData.ageRecommendation}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, ageRecommendation: e.target.value } : prev))
                    }
                    className={inputClass}
                  >
                    <option value="全年龄">全年龄</option>
                    <option value="12+">12+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                  </select>
                </div>
                <div className="sm:col-span-2 pb-3">
                  <label className="group flex cursor-pointer items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                        formData.hasPaidContent
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-neutral-300 group-hover:border-orange-400'
                      }`}
                    >
                      {formData.hasPaidContent && <Plus size={14} className="rotate-45 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.hasPaidContent}
                      onChange={(e) =>
                        setFormData((prev) => (prev ? { ...prev, hasPaidContent: e.target.checked } : prev))
                      }
                    />
                    <span className="text-sm font-bold text-neutral-700">包含付费内容</span>
                  </label>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>官方网站</label>
                  <input
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => (prev ? { ...prev, website: e.target.value } : prev))
                    }
                    className={inputClass}
                  />
                </div>
                {formData.serverType === 'modded' && (
                  <div>
                    <label className={labelClass}>整合包下载</label>
                    <input
                      value={formData.modpackUrl}
                      onChange={(e) =>
                        setFormData((prev) => (prev ? { ...prev, modpackUrl: e.target.value } : prev))
                      }
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-5 rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-neutral-800">
                    <Plus size={16} className="text-orange-500" />
                    社交渠道
                  </h4>
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50"
                  >
                    添加
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.socialLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <select
                        value={link.platform}
                        onChange={(e) => updateSocialLink(idx, 'platform', e.target.value)}
                        className={`${inputClass} !w-36 !py-2.5`}
                      >
                        <option value="QQ">QQ</option>
                        <option value="Discord">Discord</option>
                        <option value="Bilibili">Bilibili</option>
                        <option value="抖音">抖音</option>
                        <option value="微信">微信</option>
                      </select>
                      <input
                        value={link.url}
                        onChange={(e) => updateSocialLink(idx, 'url', e.target.value)}
                        className={`${inputClass} !py-2.5`}
                        placeholder="输入群号或 URL"
                      />
                      <button
                        type="button"
                        onClick={() => removeSocialLink(idx)}
                        className="rounded-xl p-2.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {formData.socialLinks.length === 0 && (
                    <p className="py-2 text-center text-xs text-neutral-400">暂无社交链接</p>
                  )}
                </div>

                <div className="mt-5 border-t border-neutral-200 pt-5">
                  <label className="group flex cursor-pointer items-center gap-2 text-sm font-bold text-neutral-700">
                    <input
                      type="checkbox"
                      checked={formData.hasVoiceChat}
                      onChange={(e) =>
                        setFormData((prev) => (prev ? { ...prev, hasVoiceChat: e.target.checked } : prev))
                      }
                      className="h-4 w-4 accent-orange-500"
                    />
                    推荐语音平台
                  </label>
                  {formData.hasVoiceChat && (
                    <div className="mt-4 flex gap-3">
                      <select
                        value={formData.voicePlatform}
                        onChange={(e) =>
                          setFormData((prev) => (prev ? { ...prev, voicePlatform: e.target.value } : prev))
                        }
                        className={`${inputClass} !w-40 !py-2.5`}
                      >
                        <option value="QQ">QQ</option>
                        <option value="Discord">Discord</option>
                        <option value="KOOK">KOOK</option>
                        <option value="TeamSpeak">TeamSpeak</option>
                      </select>
                      <input
                        value={formData.voiceUrl}
                        onChange={(e) =>
                          setFormData((prev) => (prev ? { ...prev, voiceUrl: e.target.value } : prev))
                        }
                        className={`${inputClass} !py-2.5`}
                        placeholder="频道 ID 或邀请链接"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-neutral-100" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">业务标签</h3>
                  <div className="h-px flex-1 bg-neutral-100" />
                </div>

                <div className="grid gap-6">
                  <IconTagEditor
                    title="核心特色"
                    tags={formData.features}
                    dictItems={tagDict.filter((t: any) => t.category === 'features')}
                    fallbackColor="#10b981"
                    onChange={(tags) => setFormData((prev) => (prev ? { ...prev, features: tags } : prev))}
                  />
                  <IconTagEditor
                    title="玩法机制"
                    tags={formData.mechanics}
                    dictItems={tagDict.filter((t: any) => t.category === 'mechanics')}
                    fallbackColor="#f97316"
                    onChange={(tags) => setFormData((prev) => (prev ? { ...prev, mechanics: tags } : prev))}
                  />
                  <IconTagEditor
                    title="补充元素"
                    tags={formData.elements}
                    dictItems={tagDict.filter((t: any) => t.category === 'elements')}
                    fallbackColor="#8b5cf6"
                    onChange={(tags) => setFormData((prev) => (prev ? { ...prev, elements: tags } : prev))}
                  />
                  <IconTagEditor
                    title="社区生态"
                    tags={formData.community}
                    dictItems={tagDict.filter((t: any) => t.category === 'community')}
                    fallbackColor="#0ea5e9"
                    onChange={(tags) => setFormData((prev) => (prev ? { ...prev, community: tags } : prev))}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between rounded-b-[28px] border-t border-neutral-100 bg-white/80 p-6 backdrop-blur-xl shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 text-neutral-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                  <span className="text-xs font-medium">当前编辑内容尚未保存</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-10 py-4 text-sm font-bold tracking-wider text-white transition-all hover:-translate-y-1 hover:bg-neutral-800 hover:shadow-2xl active:translate-y-0 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                  {isSaving ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

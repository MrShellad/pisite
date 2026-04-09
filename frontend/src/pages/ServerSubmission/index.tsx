import { Link } from 'react-router-dom';
import {
  AlignLeft,
  ArrowLeft,
  ChevronDown,
  ImagePlus,
  Mail,
  Mic,
  Plus,
  Server,
  X,
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import Footer from '@/components/Footer';
import { styleTokens } from '@/lib/design-tokens';
import type { SocialLink } from '@/types';
import IconTagEditor from './components/IconTagEditor';
import StringTagEditor from './components/StringTagEditor';
import VersionTagEditor from './components/VersionTagEditor';
import { useServerSubmission } from './useServerSubmission';

const SERVER_TYPE_LABELS: Record<string, string> = {
  vanilla: '纯净原版',
  plugin: '插件服',
  modded: '模组服',
};

export default function ServerSubmissionPage() {
  const {
    formData,
    setFormData,
    verificationCode,
    setVerificationCode,
    verificationId,
    verificationToken,
    verifiedEmail,
    verifiedAt,
    pendingAssets,
    isUploading,
    isSendingCode,
    isVerifyingCode,
    isSubmitting,
    message,
    tagDict,
    error,
    handleUpload,
    handleSendVerificationCode,
    handleVerifyCode,
    handleSubmit,
  } = useServerSubmission();

  const fieldClass =
    'w-full rounded-2xl border border-neutral-200 bg-white/85 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-100';
  const cardClass =
    'rounded-[28px] border border-neutral-200/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70';
  const labelClass =
    'mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400';

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const normalizedEmail = formData.contactEmail.trim().toLowerCase();
  const isEmailVerified = Boolean(verificationToken && verifiedEmail === normalizedEmail);
  const serverTypeName = SERVER_TYPE_LABELS[formData.serverType] ?? '服务器';

  const addSocialLink = () =>
    setFormData((current) => ({
      ...current,
      socialLinks: [...current.socialLinks, { platform: 'QQ', url: '' }],
    }));

  const updateSocialLink = (index: number, key: keyof SocialLink, value: string) => {
    const nextLinks = [...formData.socialLinks];
    nextLinks[index] = { ...nextLinks[index], [key]: value };
    setFormData((current) => ({ ...current, socialLinks: nextLinks }));
  };

  const removeSocialLink = (index: number) =>
    setFormData((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((_, itemIndex) => itemIndex !== index),
    }));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#fff8f1_0%,_#fffdf9_48%,_#f8fafc_100%)] text-neutral-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.32),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.28),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#020617_100%)] dark:text-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-200 dark:hover:border-orange-400/70"
          >
            <ArrowLeft size={16} />
            返回首页
          </Link>
          <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-orange-600 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300">
            SERVER SUBMISSION
          </div>
        </div>

        <div className="mb-10 mt-12 flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white dark:bg-neutral-50 dark:text-neutral-900">
            <Server size={14} />
            服务器投稿
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-neutral-950 dark:text-neutral-50 md:text-5xl">
            让更多玩家发现你的服务器
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
            完整的图文内容、准确的版本信息和真实可验证的联系邮箱，会显著提升审核效率与玩家点击意愿。
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr]">
          <section className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-6 overflow-y-auto pb-4 pr-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[32px] border border-neutral-200 bg-white/80 shadow-[0_30px_120px_rgba(15,23,42,0.1)] dark:border-neutral-800 dark:bg-neutral-950/70">
              {formData.hero ? (
                <img src={formData.hero} alt="Hero 预览" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-900 text-white/50">
                  <ImagePlus size={32} />
                </div>
              )}

              {formData.icon && (
                <img
                  src={formData.icon}
                  alt="Icon 预览"
                  className="absolute left-5 top-5 h-16 w-16 rounded-xl border-2 border-white bg-white object-cover shadow-lg"
                />
              )}

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-black/60 px-5 py-4 text-white backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xl font-bold">{formData.name || '服务器名称'}</div>
                    <div className="mt-1 flex gap-2 text-xs text-white/70">
                      <span>{serverTypeName}</span>
                      <span>|</span>
                      <span>
                        {formData.ip || 'play.example.com'}
                        {formData.port !== 25565 ? `:${formData.port}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-green-400">
                      {formData.onlinePlayers}/{formData.maxPlayers} 在线
                    </div>
                    <div className="mt-1 text-white/60">
                      {formData.versions.length > 0 ? formData.versions.join(', ') : '暂无版本'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-neutral-900">
                <AlignLeft size={18} className="text-orange-500" />
                详情介绍预览
              </h3>
              <div
                className="prose prose-sm prose-orange max-w-none break-words prose-img:rounded-xl prose-a:text-orange-600 prose-headings:font-bold"
                dangerouslySetInnerHTML={{
                  __html: formData.description || '<p class="text-neutral-400">这里会显示服务器简介预览。</p>',
                }}
              />
            </div>
          </section>

          <section className={cardClass}>
            {(error || message) && (
              <div
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  error
                    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                    : isEmailVerified
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                }`}
              >
                {error || message}
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <h3 className="border-b border-neutral-200 pb-2 font-bold text-neutral-800 dark:border-neutral-800 dark:text-neutral-100">
                  1. 视觉资产
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>服务器 Icon *</label>
                    <label className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-orange-300 bg-orange-50 text-sm font-semibold text-orange-600 transition hover:bg-orange-100 dark:border-orange-500/60 dark:bg-orange-500/10 dark:text-orange-300">
                      {isUploading === 'icon' ? '上传中...' : '选择 Icon'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleUpload(event, 'icon')}
                        disabled={isSubmitting}
                      />
                    </label>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {pendingAssets.icon.fileName || '支持 PNG/JPG，建议 1:1 且不超过 1MB'}
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Hero 封面 *</label>
                    <label className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50 text-sm font-semibold text-sky-600 transition hover:bg-sky-100 dark:border-sky-500/60 dark:bg-sky-500/10 dark:text-sky-300">
                      {isUploading === 'hero' ? '上传中...' : '选择封面'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => void handleUpload(event, 'hero')}
                        disabled={isSubmitting}
                      />
                    </label>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {pendingAssets.hero.fileName || '推荐 16:9 比例'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="border-b border-neutral-200 pb-2 font-bold text-neutral-800 dark:border-neutral-800 dark:text-neutral-100">
                  2. 基础信息
                </h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>服务器名称 *</label>
                    <input
                      required
                      maxLength={32}
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, name: event.target.value }))
                      }
                      className={fieldClass}
                      placeholder="极光生存"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>服务器类型 *</label>
                    <div className="relative">
                      <select
                        value={formData.serverType}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            serverType: event.target.value,
                            modpackUrl: event.target.value !== 'modded' ? '' : current.modpackUrl,
                          }))
                        }
                        className={`${fieldClass} appearance-none pr-10`}
                      >
                        <option value="vanilla">纯净原版</option>
                        <option value="plugin">插件服</option>
                        <option value="modded">模组服</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>语言</label>
                    <input
                      value={formData.language}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, language: event.target.value }))
                      }
                      className={fieldClass}
                      placeholder="zh-CN"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>详情介绍 *</label>
                  <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/85 transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 dark:border-neutral-800 dark:bg-neutral-950/60">
                    <ReactQuill
                      theme="snow"
                      modules={quillModules}
                      value={formData.description}
                      onChange={(value) => setFormData((current) => ({ ...current, description: value }))}
                      className="h-[300px] border-0 pb-10 text-neutral-900 dark:text-neutral-100"
                      placeholder="详细介绍你的服务器玩法、规则与亮点..."
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>连接地址 (IP / 域名) *</label>
                    <input
                      required
                      value={formData.ip}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, ip: event.target.value }))
                      }
                      className={fieldClass}
                      placeholder="play.example.com"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>端口 *</label>
                    <input
                      required
                      type="number"
                      value={formData.port}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, port: Number(event.target.value) }))
                      }
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>最大人数 *</label>
                    <input
                      required
                      type="number"
                      min={1}
                      value={formData.maxPlayers}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, maxPlayers: Number(event.target.value) }))
                      }
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>官方网站</label>
                    <input
                      value={formData.website}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, website: event.target.value }))
                      }
                      className={fieldClass}
                      placeholder="https://"
                    />
                  </div>
                  {formData.serverType === 'modded' && (
                    <div>
                      <label className={labelClass}>整合包下载地址 *</label>
                      <input
                        required
                        value={formData.modpackUrl}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, modpackUrl: event.target.value }))
                        }
                        className={fieldClass}
                        placeholder="https://"
                      />
                    </div>
                  )}
                </div>

                <div className="grid items-end gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>年龄建议</label>
                    <div className="relative">
                      <select
                        value={formData.ageRecommendation}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, ageRecommendation: event.target.value }))
                        }
                        className={`${fieldClass} appearance-none pr-10`}
                      >
                        <option value="全年龄">全年龄</option>
                        <option value="12+">12+</option>
                        <option value="16+">16+</option>
                        <option value="18+">18+</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                    </div>
                  </div>
                  <div className="pb-3 sm:col-span-2">
                    <label className="group flex cursor-pointer items-center gap-3">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                          formData.hasPaidContent
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-neutral-300 group-hover:border-orange-400 dark:border-neutral-600'
                        }`}
                      >
                        {formData.hasPaidContent && <Plus size={14} className="rotate-45 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.hasPaidContent}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, hasPaidContent: event.target.checked }))
                        }
                      />
                      <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                        包含付费内容 (如 VIP 等)
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>MC 版本 *</label>
                  <VersionTagEditor
                    tags={formData.versions}
                    placeholder="输入后回车，可连续添加多个版本"
                    onChange={(tags) => setFormData((current) => ({ ...current, versions: tags }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="border-b border-neutral-200 pb-2 font-bold text-neutral-800 dark:border-neutral-800 dark:text-neutral-100">
                  3. 标签与社交
                </h3>

                <IconTagEditor
                  title="核心特色"
                  tags={formData.features}
                  dictItems={tagDict.filter((item) => item.category === 'features')}
                  fallbackColor="#10b981"
                  onChange={(tags) => setFormData((current) => ({ ...current, features: tags }))}
                />
                <IconTagEditor
                  title="玩法机制"
                  tags={formData.mechanics}
                  dictItems={tagDict.filter((item) => item.category === 'mechanics')}
                  fallbackColor="#f97316"
                  onChange={(tags) => setFormData((current) => ({ ...current, mechanics: tags }))}
                />
                <IconTagEditor
                  title="补充元素"
                  tags={formData.elements}
                  dictItems={tagDict.filter((item) => item.category === 'elements')}
                  fallbackColor="#8b5cf6"
                  onChange={(tags) => setFormData((current) => ({ ...current, elements: tags }))}
                />
                <IconTagEditor
                  title="社区生态"
                  tags={formData.community}
                  dictItems={tagDict.filter((item) => item.category === 'community')}
                  fallbackColor="#0ea5e9"
                  onChange={(tags) => setFormData((current) => ({ ...current, community: tags }))}
                />
                <StringTagEditor
                  tags={formData.tags}
                  placeholder="例如：不掉落、原创副本、职业系统"
                  onChange={(tags) => setFormData((current) => ({ ...current, tags }))}
                />

                <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-neutral-800 dark:text-neutral-100">社交链接</div>
                    <button
                      type="button"
                      onClick={addSocialLink}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50"
                    >
                      <Plus size={14} />
                      添加
                    </button>
                  </div>

                  {formData.socialLinks.map((link, index) => (
                    <div key={`${link.platform}-${index}`} className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative w-full sm:w-1/3">
                        <select
                          value={link.platform}
                          onChange={(event) => updateSocialLink(index, 'platform', event.target.value)}
                          className={`${fieldClass} appearance-none !py-2 pr-10`}
                        >
                          <option value="QQ">QQ</option>
                          <option value="Discord">Discord</option>
                          <option value="Bilibili">Bilibili</option>
                          <option value="抖音">抖音</option>
                          <option value="微博">微博</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <input
                        value={link.url}
                        onChange={(event) => updateSocialLink(index, 'url', event.target.value)}
                        className={`${fieldClass} !py-2 flex-1`}
                        placeholder="输入群号、主页或邀请链接"
                      />
                      <button
                        type="button"
                        onClick={() => removeSocialLink(index)}
                        className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-white/70 p-4 transition hover:border-orange-300 dark:border-neutral-800 dark:bg-neutral-950/50">
                    <input
                      type="checkbox"
                      checked={formData.hasVoiceChat}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          hasVoiceChat: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 rounded border-neutral-300 accent-orange-500"
                    />
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-sm font-bold text-neutral-700 dark:text-neutral-100">
                        <Mic size={16} className="text-orange-500" />
                        提供官方语音频道
                      </span>
                    </div>
                  </label>

                  {formData.hasVoiceChat && (
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <div className="relative">
                          <select
                            value={formData.voicePlatform}
                            onChange={(event) =>
                              setFormData((current) => ({
                                ...current,
                                voicePlatform: event.target.value,
                              }))
                            }
                            className={`${fieldClass} appearance-none pr-10`}
                          >
                            <option value="QQ">QQ 语音</option>
                            <option value="Discord">Discord</option>
                            <option value="KOOK">KOOK</option>
                            <option value="TeamSpeak">TeamSpeak</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        </div>
                      </div>
                      <input
                        value={formData.voiceUrl}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, voiceUrl: event.target.value }))
                        }
                        className={fieldClass}
                        placeholder="输入频道地址或邀请链接"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-neutral-100">4. 邮箱验证码</h3>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
                    提交前必须完成
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className={labelClass}>联系邮箱 *</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            contactEmail: event.target.value,
                          }))
                        }
                        className={`${fieldClass} pl-11`}
                        placeholder="审核通知会发送到此邮箱"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void handleSendVerificationCode()}
                      disabled={isSendingCode}
                      className="h-12 rounded-2xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                    >
                      {isSendingCode ? '发送中...' : verificationId ? '重新发送验证码' : '发送验证码'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className={labelClass}>邮箱验证码 *</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      className={fieldClass}
                      placeholder="输入 6 位验证码"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => void handleVerifyCode()}
                      disabled={!verificationId || isVerifyingCode}
                      className="h-12 rounded-2xl border border-sky-200 bg-sky-50 px-5 text-sm font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
                    >
                      {isVerifyingCode ? '验证中...' : '校验验证码'}
                    </button>
                  </div>
                </div>

                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    isEmailVerified
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                  }`}
                >
                  {isEmailVerified
                    ? `邮箱验证通过${verifiedAt ? `，验证时间 ${verifiedAt}` : ''}。`
                    : '请先发送验证码并完成邮箱校验。'}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`mt-8 w-full rounded-2xl bg-neutral-900 px-6 py-4 text-base font-bold tracking-wider text-white shadow-xl transition hover:-translate-y-1 hover:bg-neutral-800 disabled:opacity-60 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 ${styleTokens.focusRing}`}
              >
                {isSubmitting ? '正在验证并提交...' : '确认提交服务器资料'}
              </button>
            </form>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

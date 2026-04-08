// frontend/src/pages/ServerSubmission/index.tsx
import { Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Server, AlignLeft, Plus, X, Mic, ChevronDown, Link as LinkIcon } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import Footer from '@/components/Footer';
import { styleTokens } from '@/lib/design-tokens';
import { useServerSubmission } from './useServerSubmission';
import IconTagEditor from './components/IconTagEditor';
import StringTagEditor from './components/StringTagEditor';
import VersionTagEditor from './components/VersionTagEditor';
import type { SocialLink } from '@/types';

export default function ServerSubmissionPage() {
  const {
    formData, setFormData, isUploading, isSubmitting, message, error,
    tagDict, handleUpload, handleSubmit
  } = useServerSubmission();

  const fieldClass =
    'w-full rounded-2xl border border-neutral-200 bg-white/85 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:bg-neutral-900/70 dark:border-neutral-700 dark:text-neutral-100';
  const cardClass =
    'rounded-[28px] border border-neutral-200/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-neutral-950/70 dark:border-neutral-800';
  const labelClass =
    'mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400';

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const serverTypeName = formData.serverType === 'vanilla' ? '纯净原版' : formData.serverType === 'plugin' ? '插件服' : '模组服';

  // 社交链接动态操作方法
  const addSocialLink = () => setFormData(c => ({ ...c, socialLinks: [...c.socialLinks, { platform: 'QQ', url: '' }] }));
  const updateSocialLink = (index: number, key: keyof SocialLink, value: string) => {
    const newLinks = [...formData.socialLinks];
    newLinks[index] = { ...newLinks[index], [key]: value };
    setFormData(c => ({ ...c, socialLinks: newLinks }));
  };
  const removeSocialLink = (index: number) => setFormData(c => ({ ...c, socialLinks: c.socialLinks.filter((_, i) => i !== index) }));

  // 图标上传前校验（大小 < 1MB, 分辨率建议 1:1）
  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'hero') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 限制文件大小为 1MB
    if (file.size > 1024 * 1024) {
      alert('图片大小不能超过 1MB');
      return;
    }

    if (type === 'icon') {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        // 限制图标分辨率建议为 512x512 以内，防止加载过慢
        if (img.width > 512 || img.height > 512) {
          alert('图标分辨率建议在 512x512 以内');
        }
        handleUpload(e, type);
      };
    } else {
      handleUpload(e, type);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#fff8f1_0%,_#fffdf9_48%,_#f8fafc_100%)] text-neutral-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.32),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.28),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#020617_100%)] dark:text-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ================= 1. 顶部导航 ================= */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-200 dark:hover:border-orange-400/70"
          >
            <ArrowLeft size={16} /> 返回首页
          </Link>
          <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-orange-600 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300">
            SERVER SUBMISSION
          </div>
        </div>

        {/* ================= 2. 页面全局标题 ================= */}
        <div className="mt-12 mb-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white mb-6 dark:bg-neutral-50 dark:text-neutral-900">
            <Server size={14} /> 发现页收录
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-neutral-950 md:text-5xl mb-4 dark:text-neutral-50">
            让更多玩家发现你的世界
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
            完整的图文特色标签与精美的排版能显著提升玩家的点击率，请尽可能详细地填写服务器机制与内容。
          </p>
        </div>

        {/* ================= 3. 双栏布局 (编辑区与预览区) ================= */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] items-start">

          {/* 左侧：实时预览区 (固定吸顶) */}
          <section className="sticky top-6 space-y-6 max-h-[calc(100vh-3rem)] overflow-y-auto pb-4 pr-2 custom-scrollbar">

            <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white/80 shadow-[0_30px_120px_rgba(15,23,42,0.1)] relative aspect-[16/10] dark:bg-neutral-950/70 dark:border-neutral-800 dark:shadow-[0_40px_140px_rgba(15,23,42,0.9)]">
              {formData.hero ? (
                <img src={formData.hero} alt="Hero预览" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-900 text-white/50">
                  <ImagePlus size={32} />
                </div>
              )}
              {formData.icon && (
                <img
                  src={formData.icon}
                  alt="Icon"
                  className="absolute top-5 left-5 w-16 h-16 rounded-xl border-2 border-white shadow-lg bg-white object-cover"
                />
              )}

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-black/60 px-5 py-4 text-white backdrop-blur flex justify-between items-end">
                <div>
                  <div className="text-xl font-bold">{formData.name || '服务器名称'}</div>
                  <div className="text-xs text-white/70 mt-1 flex gap-2">
                    <span>{serverTypeName}</span>
                    <span>|</span>
                    <span>{formData.ip || 'play.example.com'}{formData.port !== 25565 ? `:${formData.port}` : ''}</span>
                  </div>

                  {/* 社交平台与语音的预览徽章 */}
                  {(formData.socialLinks.length > 0 || formData.hasVoiceChat) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.socialLinks.map((link, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/20 text-white px-2 py-1 rounded-md backdrop-blur"
                        >
                          <LinkIcon size={10} /> {link.platform}
                        </span>
                      ))}
                      {formData.hasVoiceChat && formData.voicePlatform && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-orange-500/80 text-white px-2 py-1 rounded-md backdrop-blur">
                          <Mic size={10} /> {formData.voicePlatform} 语音
                        </span>
                      )}
                    </div>
                  )}

                </div>
                <div className="text-right text-xs">
                  <div className="text-green-400 font-bold">{formData.onlinePlayers}/{formData.maxPlayers} 在线</div>
                  <div className="text-white/50 mt-1 flex flex-col items-end gap-1">
                    <div>{formData.versions.length > 0 ? formData.versions.slice(0, 2).join(', ') + (formData.versions.length > 2 ? ' 等' : '') : '暂无版本'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {formData.hasPaidContent && (
                        <span className="text-yellow-400 border border-yellow-400/50 px-1 rounded text-[10px]">
                          含内购
                        </span>
                      )}
                      <span className="text-neutral-300">{formData.ageRecommendation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <AlignLeft size={18} className="text-orange-500" /> 详情介绍预览
              </h3>
              <div
                className="prose prose-sm prose-orange max-w-none prose-img:rounded-xl prose-headings:font-bold prose-a:text-orange-600 break-words"
                dangerouslySetInnerHTML={{ __html: formData.description || '<p class="text-neutral-400">在此处预览你的服务器详细介绍...</p>' }}
              />
            </div>
          </section>

          {/* 右侧：表单填写区 */}
          <section className={cardClass}>
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-bold dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-bold dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                {message}
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>

              <div className="space-y-4">
                <h3 className="font-bold border-b border-neutral-200 pb-2 text-neutral-800 dark:text-neutral-100 dark:border-neutral-800">
                  1. 视觉资产
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>服务器 Icon *</label>
                    <label className="flex items-center justify-center w-full h-12 rounded-xl border border-dashed border-orange-300 bg-orange-50 cursor-pointer hover:bg-orange-100 transition text-sm font-semibold text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/60 dark:text-orange-300">
                      {isUploading === 'icon' ? '上传中...' : '上传 Icon (推荐1:1)'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageUpload(e, 'icon')} disabled={!!isUploading} />
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>Hero 封面大图 *</label>
                    <label className="flex items-center justify-center w-full h-12 rounded-xl border border-dashed border-sky-300 bg-sky-50 cursor-pointer hover:bg-sky-100 transition text-sm font-semibold text-sky-600 dark:bg-sky-500/10 dark:border-sky-500/60 dark:text-sky-300">
                      {isUploading === 'hero' ? '上传中...' : '上传封面 (推荐16:9)'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageUpload(e, 'hero')} disabled={!!isUploading} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold border-b border-neutral-200 pb-2 text-neutral-800 dark:text-neutral-100 dark:border-neutral-800">
                  2. 基础信息
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>服务器名称 (Max 32) *</label>
                    <input 
                      required 
                      maxLength={32}
                      value={formData.name} 
                      onChange={e => setFormData(c => ({ ...c, name: e.target.value }))} 
                      className={fieldClass} 
                      placeholder="极光生存" 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>服务器类型</label>
                    <div className="relative">
                      <select
                        value={formData.serverType}
                        onChange={e =>
                          setFormData(c => ({
                            ...c,
                            serverType: e.target.value,
                            modpackUrl: e.target.value !== 'modded' ? '' : c.modpackUrl,
                          }))
                        }
                        className={`${fieldClass} pr-10 appearance-none bg-white/85 dark:bg-neutral-900/70`}
                      >
                        <option value="vanilla">纯净原版</option>
                        <option value="plugin">插件服</option>
                        <option value="modded">模组服</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>详情介绍 (Max 1000 字) *</label>
                  <div className="bg-white/85 rounded-2xl overflow-hidden border border-neutral-200 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition relative dark:bg-neutral-950/60 dark:border-neutral-800">
                    <ReactQuill 
                      theme="snow" 
                      modules={quillModules} 
                      value={formData.description} 
                      onChange={(value) => {
                        // 简单计算字数，Quill 包含 HTML 标签，这里建议后端也做校验
                        if (value.length <= 1200) { // 预留 HTML 标签长度
                          setFormData(c => ({ ...c, description: value }));
                        }
                      }} 
                      className="h-[300px] pb-10 border-0 text-neutral-900 dark:text-neutral-100" 
                      placeholder="详细介绍你的服务器玩法、规则与特色内容..." 
                    />
                  </div>
                  <style>{`
                    .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #e5e7eb; background: #fafafa; }
                    .ql-container.ql-snow { border: none; }
                    .dark .ql-toolbar.ql-snow { border-bottom-color: #1f2937; background: #020617; }
                    .dark .ql-container.ql-snow { background: transparent; color: #e5e7eb; }
                    .dark .ql-picker, .dark .ql-stroke { color: #9ca3af; stroke: #9ca3af; }
                  `}</style>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 mt-6">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>连接 IP *</label>
                    <input
                      required
                      value={formData.ip}
                      onChange={e => setFormData(c => ({ ...c, ip: e.target.value }))}
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
                      onChange={e => setFormData(c => ({ ...c, port: Number(e.target.value) }))}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* MC 版本独占一行 */}
                <div className="w-full">
                  <label className={labelClass}>MC 版本 (支持搜索最新与快照版) *</label>
                  <VersionTagEditor
                    tags={formData.versions}
                    placeholder="例如 1.20.1 或 24w13a，输入数字搜索"
                    onChange={(tags) => setFormData(c => ({ ...c, versions: tags }))}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>最大人数</label>
                    <input
                      required
                      type="number"
                      value={formData.maxPlayers}
                      onChange={e => setFormData(c => ({ ...c, maxPlayers: Number(e.target.value) }))}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>适龄提示</label>
                    <div className="relative">
                      <select
                        value={formData.ageRecommendation}
                        onChange={e => setFormData(c => ({ ...c, ageRecommendation: e.target.value }))}
                        className={`${fieldClass} pr-10 appearance-none bg-white/85 dark:bg-neutral-900/70`}
                      >
                        <option value="全年龄">绿色全年龄 (推荐)</option>
                        <option value="12+">12+ (适度战斗机制)</option>
                        <option value="16+">16+ (较高强度竞技)</option>
                        <option value="18+">18+ (包含无政府/残酷抄家)</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* 氪金复选框描述文字不换行 */}
                  <div className="flex items-center">
                    <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 w-full text-sm font-medium text-neutral-700 cursor-pointer hover:border-orange-300 transition whitespace-nowrap overflow-hidden dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200">
                      <input type="checkbox" checked={formData.hasPaidContent} onChange={(e) => setFormData(current => ({ ...current, hasPaidContent: e.target.checked }))} className="h-5 w-5 accent-orange-500 rounded border-neutral-300 shrink-0" />
                      存在氪金内容
                    </label>
                  </div>

                  <div className={formData.serverType === 'modded' ? '' : 'hidden'}>
                    <label className={labelClass}>整合包下载链接 *</label>
                    <input
                      required={formData.serverType === 'modded'}
                      value={formData.modpackUrl}
                      onChange={e => setFormData(c => ({ ...c, modpackUrl: e.target.value }))}
                      className={fieldClass}
                      placeholder="百度网盘 / 123盘等链接"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>官网或主页 (选填)</label>
                  <input
                    value={formData.website}
                    onChange={e => setFormData(c => ({ ...c, website: e.target.value }))}
                    className={fieldClass}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold border-b border-neutral-200 pb-2 text-neutral-800 dark:text-neutral-100 dark:border-neutral-800">
                  3. 图文标签阵列
                </h3>
                <IconTagEditor title="🚀 核心特色" tags={formData.features} dictItems={tagDict.filter(t => t.category === 'features')} fallbackColor="#10b981" onChange={(tags) => setFormData(c => ({ ...c, features: tags }))} />
                <IconTagEditor title="⚙️ 玩法机制" tags={formData.mechanics} dictItems={tagDict.filter(t => t.category === 'mechanics')} fallbackColor="#f97316" onChange={(tags) => setFormData(c => ({ ...c, mechanics: tags }))} />
                <IconTagEditor title="🔮 补充元素" tags={formData.elements} dictItems={tagDict.filter(t => t.category === 'elements')} fallbackColor="#8b5cf6" onChange={(tags) => setFormData(c => ({ ...c, elements: tags }))} />
                <IconTagEditor title="🤝 社区生态" tags={formData.community} dictItems={tagDict.filter(t => t.category === 'community')} fallbackColor="#0ea5e9" onChange={(tags) => setFormData(c => ({ ...c, community: tags }))} />
              </div>

              <div className="space-y-4">
                <h3 className="font-bold border-b border-neutral-200 pb-2 text-neutral-800 dark:text-neutral-100 dark:border-neutral-800">
                  4. 纯文本检索标签
                </h3>
                <StringTagEditor tags={formData.tags} placeholder="如：不掉落、免费飞行，回车添加" onChange={(tags) => setFormData(c => ({ ...c, tags: tags }))} />
              </div>

              {/* 5. 社交与通讯 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-neutral-100">5. 社交引流与通讯</h3>
                  <button type="button" onClick={addSocialLink} className="text-xs font-semibold text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                    <Plus size={14} /> 添加社交链接
                  </button>
                </div>

                {/* 社交平台列表 */}
                <div className="space-y-3">
                  {formData.socialLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center bg-neutral-50 p-3 rounded-xl border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800"
                    >
                      <div className="relative w-full sm:w-1/3">
                        <select
                          value={link.platform}
                          onChange={e => updateSocialLink(idx, 'platform', e.target.value)}
                          className={`${fieldClass} !py-2 pr-10 appearance-none bg-white/85 dark:bg-neutral-900/70`}
                        >
                          <option value="QQ">QQ / QQ群</option>
                          <option value="Discord">Discord</option>
                          <option value="B站">B站 (Bilibili)</option>
                          <option value="抖音">抖音</option>
                          <option value="微博">微博</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      </div>
                      <input
                        value={link.url}
                        onChange={e => updateSocialLink(idx, 'url', e.target.value)}
                        className={`${fieldClass} !py-2 flex-1`}
                        placeholder="请输入频道链接或群号"
                      />
                      <button type="button" onClick={() => removeSocialLink(idx)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 语音频道条件渲染 */}
                <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:border-orange-300 transition dark:border-neutral-800 dark:bg-neutral-900/60">
                    <input type="checkbox" checked={formData.hasVoiceChat} onChange={e => setFormData(c => ({ ...c, hasVoiceChat: e.target.checked }))} className="h-5 w-5 accent-orange-500 rounded border-neutral-300" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-neutral-700 flex items-center gap-1 dark:text-neutral-100">
                        <Mic size={16} className="text-orange-500" /> 提供官方语音开黑频道
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">勾选后可填写 QQ、Discord 等语音房间链接。</span>
                    </div>
                  </label>
                </div>

                {formData.hasVoiceChat && (
                  <div className="flex gap-4 mt-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="w-1/3">
                      <label className={labelClass}>语音平台</label>
                      <div className="relative">
                        <select
                          value={formData.voicePlatform}
                          onChange={e => setFormData(c => ({ ...c, voicePlatform: e.target.value }))}
                          className={`${fieldClass} pr-10 appearance-none bg-white/85 dark:bg-neutral-900/70`}
                        >
                          <option value="QQ">QQ 语音频道</option>
                          <option value="Discord">Discord</option>
                          <option value="oopz">oopz</option>
                          <option value="TeamSpeak">TeamSpeak</option>
                          <option value="Mumble">Mumble</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className={labelClass}>房间链接或地址 *</label>
                      <input required value={formData.voiceUrl} onChange={e => setFormData(c => ({ ...c, voiceUrl: e.target.value }))} className={fieldClass} placeholder="输入语音频道链接或服务器 IP" />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-2xl px-6 py-4 text-base font-bold tracking-wider text-white transition disabled:opacity-60 shadow-xl hover:-translate-y-1 mt-8 bg-neutral-900 hover:bg-neutral-800 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 ${styleTokens.focusRing}`}
              >
                {isSubmitting ? '正在提交...' : '🚀 确认提交服务器资料'}
              </button>
            </form>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
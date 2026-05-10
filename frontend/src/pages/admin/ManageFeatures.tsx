// frontend/src/pages/admin/ManageFeatures.tsx
import { ImagePlus, Plus, Save, Trash2, Power, LayoutGrid, Upload } from 'lucide-react';
import { getUploadUrl } from '../../api/client';
import { useManageFeatures } from './hooks/useManageFeatures';

export default function ManageFeatures() {
  const {
    features,
    screenshots,
    isLoading,
    isSubmitting,
    isScreenshotSubmitting,
    uploadingScreenshotId,
    formData,
    screenshotFormData,
    handleChange,
    handleScreenshotFormChange,
    handleSubmit,
    handleToggle,
    handleDelete,
    handleScreenshotUpload,
    handleScreenshotSubmit,
    updateScreenshotDraft,
    handleScreenshotSave,
    handleScreenshotDelete,
  } = useManageFeatures();

  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm";
  const labelClass = "block text-xs text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5 uppercase tracking-wider font-semibold";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
          <LayoutGrid className="text-blue-500" /> 核心特性管理
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`${cardClass} h-fit xl:col-span-1`}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg"><Plus size={16}/></div> 挂载新特性
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className={labelClass}>特性唯一 ID</label><input required value={formData.id} onChange={e => handleChange('id', e.target.value)} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>显示标题</label><input required value={formData.title} onChange={e => handleChange('title', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>排序优先级</label><input required type="number" value={formData.priority} onChange={e => handleChange('priority', Number(e.target.value))} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>详细描述</label><textarea required value={formData.desc} onChange={e => handleChange('desc', e.target.value)} className={`${inputClass} h-24`} /></div>
            
            <div className="p-4 bg-neutral-100/50 dark:bg-black/20 rounded-2xl border border-neutral-200 dark:border-white/5 space-y-4">
              <div><label className={labelClass}>图标主题色 (Hex)</label><input type="color" value={formData.iconColor} onChange={e => handleChange('iconColor', e.target.value)} className="w-10 h-10 cursor-pointer rounded-lg bg-transparent border-0 p-0" /></div>
              <div><label className={labelClass}>SVG 矢量代码</label><textarea required value={formData.iconSvg} onChange={e => handleChange('iconSvg', e.target.value)} className={`${inputClass} font-mono text-xs h-32`} /></div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 mt-2 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200">
              {isSubmitting ? '挂载中...' : '注册特性节点'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-2 p-6 bg-transparent">
          {isLoading ? <div className="text-neutral-500 animate-pulse">Loading Features...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {features.map(f => (
                <div key={f.id} className={`p-5 rounded-2xl transition-all duration-300 relative overflow-hidden group flex flex-col ${f.enabled ? 'bg-white/80 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 shadow-sm dark:shadow-none' : 'bg-neutral-100/50 dark:bg-transparent border border-neutral-200 dark:border-white/5 border-dashed opacity-50 grayscale hover:opacity-80'}`}>
                  {f.enabled && <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-20 dark:opacity-20 group-hover:opacity-40" style={{ backgroundColor: f.iconColor }}></div>}
                  
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-lg transition-transform group-hover:scale-110" style={{ color: f.iconColor }}>
                      <div className="w-6 h-6 drop-shadow-[0_0_8px_currentColor]" dangerouslySetInnerHTML={{ __html: f.iconSvg }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggle(f.id)} className={`p-2 rounded-lg transition-all ${f.enabled ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-neutral-500 bg-neutral-200 dark:bg-white/5'}`}><Power size={16}/></button>
                      <button onClick={() => handleDelete(f.id)} className="p-2 text-red-500/80 dark:text-red-400/50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="relative z-10 flex-1">
                    <h4 className="font-bold text-lg text-neutral-900 dark:text-white mb-2">{f.title}</h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">{f.desc}</p>
                  </div>
                  <div className="mt-5 flex justify-between items-center relative z-10">
                    <div className="text-[10px] font-mono text-neutral-500 bg-neutral-200/60 dark:bg-black/40 px-2 py-1 rounded border border-neutral-300 dark:border-white/5">Priority: {f.priority}</div>
                    <div className="text-[10px] font-mono text-neutral-400">ID: {f.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className={`${cardClass} h-fit xl:col-span-1`}>
          <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ImagePlus size={16} />
            </div>
            添加截图预览
          </h3>
          <form onSubmit={handleScreenshotSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>截图文件</label>
              <label className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Upload size={16} />
                {uploadingScreenshotId === 'new' ? '上传中...' : '上传截图'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void handleScreenshotUpload(file);
                  }}
                />
              </label>
            </div>
            <div>
              <label className={labelClass}>图片 URL</label>
              <input
                required
                value={screenshotFormData.imageUrl}
                onChange={event => handleScreenshotFormChange('imageUrl', event.target.value)}
                className={inputClass}
                placeholder="/uploads/admin/..."
              />
            </div>
            {screenshotFormData.imageUrl && (
              <img
                src={getUploadUrl(screenshotFormData.imageUrl)}
                alt=""
                className="aspect-video w-full rounded-xl border border-neutral-200 object-cover dark:border-white/10"
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>标题</label>
                <input
                  value={screenshotFormData.title}
                  onChange={event => handleScreenshotFormChange('title', event.target.value)}
                  className={inputClass}
                  placeholder="沉浸式体验"
                />
              </div>
              <div>
                <label className={labelClass}>排序优先级</label>
                <input
                  type="number"
                  value={screenshotFormData.priority}
                  onChange={event => handleScreenshotFormChange('priority', Number(event.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>说明</label>
              <textarea
                value={screenshotFormData.caption}
                onChange={event => handleScreenshotFormChange('caption', event.target.value)}
                className={`${inputClass} h-24`}
                placeholder="用于前台卡片堆叠轮播的辅助文案"
              />
            </div>
            <button
              type="submit"
              disabled={isScreenshotSubmitting}
              className="mt-2 w-full rounded-xl bg-neutral-900 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {isScreenshotSubmitting ? '添加中...' : '添加截图'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">截图轮播管理</h3>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400">
              {screenshots.length} 张
            </span>
          </div>
          {screenshots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500 dark:border-white/10">
              暂无截图，添加后会在前台核心特性下方显示卡片堆叠轮播。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {screenshots.map(item => (
                <div key={item.id} className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
                  <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-black/30">
                    <img src={getUploadUrl(item.imageUrl)} alt={item.title || '截图预览'} className="aspect-video w-full object-cover" />
                    <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-black/55 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/70">
                      <Upload size={13} />
                      {uploadingScreenshotId === item.id ? '上传中' : '替换'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={event => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (file) void handleScreenshotUpload(file, item.id);
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className={labelClass}>图片 URL</label>
                      <input
                        value={item.imageUrl}
                        onChange={event => updateScreenshotDraft(item.id, 'imageUrl', event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_110px] gap-3">
                      <div>
                        <label className={labelClass}>标题</label>
                        <input
                          value={item.title}
                          onChange={event => updateScreenshotDraft(item.id, 'title', event.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>排序</label>
                        <input
                          type="number"
                          value={item.priority}
                          onChange={event => updateScreenshotDraft(item.id, 'priority', Number(event.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>说明</label>
                      <textarea
                        value={item.caption}
                        onChange={event => updateScreenshotDraft(item.id, 'caption', event.target.value)}
                        className={`${inputClass} h-20`}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void handleScreenshotSave(item)}
                        className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                      >
                        <Save size={14} />
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleScreenshotDelete(item.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

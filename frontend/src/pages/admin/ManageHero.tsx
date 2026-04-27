import { Download, Image as ImageIcon, Link as LinkIcon, PanelTop, Type, Upload } from 'lucide-react';

import { useManageHero } from './hooks/useManageHero';

export default function ManageHero() {
  const { formData, isSaving, isLoading, isUploading, handleChange, handleFileUpload, handleSubmit } =
    useManageHero();

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-neutral-600 dark:focus:bg-blue-500/5';
  const labelClass =
    'mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400';
  const cardClass =
    'relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';

  if (isLoading) {
    return <div className="py-10 text-center text-neutral-500 animate-pulse">Syncing Hero config...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <h2 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">
        <PanelTop className="text-blue-500" /> 首页 Hero 管理
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className={cardClass}>
            <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
              <Type size={16} className="text-indigo-500" /> 核心文案
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>主标题</label>
                  <input
                    required
                    value={formData.title}
                    onChange={event => handleChange('title', event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>副标题</label>
                  <input
                    required
                    value={formData.subtitle}
                    onChange={event => handleChange('subtitle', event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>产品介绍（支持换行）</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={event => handleChange('description', event.target.value)}
                  className={`${inputClass} h-32 leading-relaxed`}
                />
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
              <LinkIcon size={16} className="text-emerald-500" /> 下载分发
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>按钮文案</label>
                  <input
                    required
                    value={formData.buttonText}
                    onChange={event => handleChange('buttonText', event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>更新日期</label>
                  <input
                    required
                    type="date"
                    value={formData.updateDate}
                    onChange={event => handleChange('updateDate', event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 dark:border-white/5 dark:bg-black/20">
                <label className="mb-2 block text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  多平台下载 URL
                </label>
                {(['dlMac', 'dlWin', 'dlLinux'] as const).map(key => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-16 text-[10px] font-bold uppercase text-neutral-500">
                      {key.replace('dl', '')}
                    </span>
                    <input
                      required
                      value={formData[key]}
                      onChange={event => handleChange(key, event.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 dark:border-white/5 dark:bg-black/20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className={labelClass}>
                      SteamDeck 软件源下载地址
                    </label>
                    <p className="ml-1 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      仅在 Linux UA 首页展示，对应「部署SteamDeck软件源」按钮。
                    </p>
                  </div>
                  <span className="inline-flex h-fit w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-200">
                    Linux UA
                  </span>
                </div>
                <input
                  value={formData.steamDeckSourceUrl}
                  onChange={event => handleChange('steamDeckSourceUrl', event.target.value)}
                  placeholder="https://example.com/steamdeck-source"
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8 xl:col-span-1">
          <section className={`${cardClass} h-fit`}>
            <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
              <ImageIcon size={16} className="text-purple-500" /> Logo 配置
            </h3>
            <div className="space-y-6">
              <div className="group relative flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100/50 p-8 dark:border-white/5 dark:bg-black/40">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-2xl border border-neutral-300/80 transition-transform duration-500 group-hover:scale-110 dark:border-white/10"
                  style={{
                    color: formData.logoColor,
                    backgroundColor: '#ffffff',
                    backgroundImage:
                      'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                >
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="h-20 w-20 object-contain drop-shadow-[0_0_12px_currentColor]"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-neutral-600" />
                  )}
                </div>
                <span className="mt-6 text-[10px] font-bold uppercase text-neutral-500">Transparent Preview</span>
              </div>

              <div>
                <label className={labelClass}>Logo 色彩（Hex）</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.logoColor}
                    onChange={event => handleChange('logoColor', event.target.value)}
                    className="h-12 w-12 cursor-pointer rounded-xl border-0 p-0"
                  />
                  <input
                    value={formData.logoColor}
                    onChange={event => handleChange('logoColor', event.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className={labelClass}>品牌 Logo（本地上传）</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} className="h-full w-full object-contain p-1.5" alt="logo" />
                    ) : (
                      <Upload className="text-neutral-400" size={18} />
                    )}
                  </div>
                  <label className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-none dark:hover:bg-white/10">
                    {isUploading ? '上传中...' : '上传本地图片'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <input
                  value={formData.logoUrl}
                  onChange={event => handleChange('logoUrl', event.target.value)}
                  placeholder="或直接填写图片 URL..."
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="sticky top-8">
            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 font-black tracking-wide text-white shadow-lg transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black dark:shadow-[0_0_30px_rgba(255,255,255,0.15)] dark:hover:bg-neutral-200"
            >
              <Download size={20} /> {isSaving ? '保存中...' : '保存 Hero 配置'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

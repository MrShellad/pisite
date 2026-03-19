// frontend/src/pages/admin/ManageHero.tsx
import { PanelTop, Type, Link as LinkIcon, Image as ImageIcon, Download, Monitor, Upload } from 'lucide-react';
import { useManageHero } from './hooks/useManageHero';
import Hero from '../../components/Hero';

export default function ManageHero() {
  const { formData, isSaving, isLoading, isUploading, handleChange, handleFileUpload, handleSubmit } = useManageHero();

  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm";
  const labelClass = "block text-xs text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5 uppercase tracking-wider font-semibold";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none";

  if (isLoading) return <div className="text-neutral-500 animate-pulse py-10 text-center">Syncing Hero Telemetry...</div>;

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
        <PanelTop className="text-blue-500" /> 首屏 (Hero) 视觉控制台
      </h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className={cardClass}>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4"><Type size={16} className="text-indigo-500"/> 核心文案设定</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>主标题</label><input required value={formData.title} onChange={e => handleChange('title', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>副标题 (渐变)</label><input required value={formData.subtitle} onChange={e => handleChange('subtitle', e.target.value)} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>产品介绍文字 (支持 HTML)</label><textarea required value={formData.description} onChange={e => handleChange('description', e.target.value)} className={`${inputClass} h-28 leading-relaxed`} /></div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4"><LinkIcon size={16} className="text-emerald-500"/> 多端下载分发</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>按钮文字</label><input required value={formData.buttonText} onChange={e => handleChange('buttonText', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>更新日期</label><input required type="date" value={formData.updateDate} onChange={e => handleChange('updateDate', e.target.value)} className={inputClass} /></div>
              </div>
              <div className="p-5 bg-neutral-50/50 dark:bg-black/20 rounded-2xl border border-neutral-200 dark:border-white/5 space-y-4">
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2">专属系统安装包 URL</label>
                {['dlMac', 'dlWin', 'dlLinux'].map(os => (
                  <div key={os} className="flex items-center gap-4">
                    <span className="w-16 text-[10px] font-bold text-neutral-500 uppercase">{os.replace('dl','')}</span>
                    <input required value={(formData as any)[os]} onChange={e => handleChange(os as any, e.target.value)} className={inputClass} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-8">
          <div className={`${cardClass} h-fit`}>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4"><ImageIcon size={16} className="text-purple-500"/> 品牌标识</h3>
            <div className="space-y-6">
              
              {/* 【修改】图片实时预览 */}
              <div className="flex flex-col items-center justify-center p-8 bg-neutral-100/50 dark:bg-black/40 rounded-2xl border border-neutral-200 dark:border-white/5 relative group">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 border border-neutral-300/80 dark:border-white/10"
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
                    <img src={formData.logoUrl} alt="Logo" className="w-16 h-16 object-contain drop-shadow-[0_0_12px_currentColor]" />
                  ) : (
                    <ImageIcon className="text-neutral-600 w-8 h-8" />
                  )}
                </div>
                <span className="text-[10px] text-neutral-500 uppercase mt-6 font-bold">Transparent Preview</span>
              </div>
              
              <div>
                <label className={labelClass}>底座光效色 (Hex)</label>
                <div className="flex gap-3 items-center">
                  <input type="color" value={formData.logoColor} onChange={e => handleChange('logoColor', e.target.value)} className="w-12 h-12 cursor-pointer rounded-xl border-0 p-0" />
                  <input value={formData.logoColor} onChange={e => handleChange('logoColor', e.target.value)} className={`${inputClass} font-mono`} />
                </div>
              </div>

              {/* 【修改】文件上传模块 */}
              <div className="space-y-3">
                <label className={labelClass}>品牌 Logo (透明 PNG 最佳)</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-contain p-1.5" /> : <Upload className="text-neutral-400" size={18} />}
                  </div>
                  <label className="cursor-pointer px-4 py-2.5 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-neutral-700 dark:text-white transition-all shadow-sm dark:shadow-none">
                    {isUploading ? '正在上传...' : '上传本地图片'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
                <input value={formData.logoUrl} onChange={e => handleChange('logoUrl', e.target.value)} placeholder="或直接粘贴外部图片 URL..." className={inputClass} />
              </div>

            </div>
          </div>
          <div className="sticky top-8">
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-black tracking-wide rounded-2xl shadow-lg dark:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              <Download size={20} /> {isSaving ? '同步中...' : '部署首屏配置'}
            </button>
          </div>
        </div>
      </form>

      {/* 实时预览区 */}
      <div className="mt-16 space-y-6">
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2"><Monitor className="text-emerald-500" /> 全景实时沙盒预览</h3>
        <div className="w-full bg-white dark:bg-[#0a0a0a] rounded-2xl border border-neutral-300 dark:border-white/10 overflow-hidden shadow-2xl relative ring-4 ring-neutral-200/50 dark:ring-black/50">
          <div className="h-10 bg-neutral-100 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10 flex items-center px-4 gap-2 relative">
            <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500/80"></div><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><div className="w-3 h-3 rounded-full bg-green-500/80"></div></div>
            <div className="absolute left-1/2 -translate-x-1/2 px-6 py-1 text-[10px] font-mono text-neutral-500 bg-white dark:bg-black/40 rounded-full border border-neutral-200 dark:border-white/5 flex items-center gap-2">
              <span className="text-green-500">🔒</span> https://flowcore.app/
            </div>
          </div>
          <div className="w-full relative bg-white dark:bg-[#050505]">
            <Hero previewConfig={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Settings, Globe, Search, Share2, Save } from 'lucide-react';
import { useSettings } from './hooks/useSettings';

export default function ManageSettings() {
  const { formData, isSaving, handleChange, handleSubmit } = useSettings();

  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white transition-all text-sm";
  const labelClass = "block text-xs text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5 uppercase tracking-wider font-semibold";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none";

  if (!formData) return <div className="animate-pulse text-neutral-500">Loading Config...</div>;

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2"><Settings className="text-blue-500"/> 全局系统设置</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className={cardClass}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 border-b border-neutral-200 dark:border-white/10 pb-4 flex items-center gap-2"><Globe size={18} className="text-blue-500"/> 基础与版权信息</h3>
          <div className="grid grid-cols-2 gap-6">
            <div><label className={labelClass}>全局站点名称 (Site Name)</label><input required value={formData.siteName} onChange={e => handleChange('siteName', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>底部版权声明</label><input required value={formData.copyright} onChange={e => handleChange('copyright', e.target.value)} className={inputClass} /></div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 border-b border-neutral-200 dark:border-white/10 pb-4 flex items-center gap-2"><Search size={18} className="text-emerald-500"/> SEO 搜索引擎优化</h3>
          <div className="space-y-5">
            <div><label className={labelClass}>浏览器标题 (Title)</label><input required value={formData.seoTitle} onChange={e => handleChange('seoTitle', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>网站描述 (Description / 底部也会展示)</label><textarea required value={formData.seoDescription} onChange={e => handleChange('seoDescription', e.target.value)} className={`${inputClass} h-24`} /></div>
            <div><label className={labelClass}>关键字 (Keywords - 逗号分隔)</label><input required value={formData.seoKeywords} onChange={e => handleChange('seoKeywords', e.target.value)} className={inputClass} /></div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 border-b border-neutral-200 dark:border-white/10 pb-4 flex items-center gap-2"><Share2 size={18} className="text-purple-500"/> 社交与联系方式</h3>
          <div className="grid grid-cols-2 gap-6">
            <div><label className={labelClass}>联系邮箱 (Contact Email)</label><input type="email" value={formData.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>GitHub URL</label><input value={formData.githubUrl} onChange={e => handleChange('githubUrl', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>X (Twitter) URL</label><input value={formData.twitterUrl} onChange={e => handleChange('twitterUrl', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Discord 群组 URL</label><input value={formData.discordUrl} onChange={e => handleChange('discordUrl', e.target.value)} className={inputClass} /></div>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-black tracking-wide rounded-2xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={20} /> {isSaving ? '保存中...' : '保存全局设置'}
        </button>
      </form>
    </div>
  );
}
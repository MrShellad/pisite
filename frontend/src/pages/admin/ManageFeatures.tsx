// frontend/src/pages/admin/ManageFeatures.tsx
import { Plus, Trash2, Power, LayoutGrid } from 'lucide-react';
import { useManageFeatures } from './hooks/useManageFeatures';

export default function ManageFeatures() {
  const { features, isLoading, isSubmitting, formData, handleChange, handleSubmit, handleToggle, handleDelete } = useManageFeatures();

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
    </div>
  );
}
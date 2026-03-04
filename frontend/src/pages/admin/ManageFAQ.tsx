// frontend/src/pages/admin/ManageFAQ.tsx
import { Plus, Trash2, Power, MessageCircle } from 'lucide-react';
import { useManageFAQ } from './hooks/useManageFAQ';

export default function ManageFAQ() {
  const {
    faqs, isLoading, isSubmitting, formData,
    handleChange, handleSubmit, handleToggle, handleDelete
  } = useManageFAQ();

  // 【适配双模】的 Magic UI 核心样式 Tokens
  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm";
  const labelClass = "block text-xs text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5 uppercase tracking-wider font-semibold";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
          <MessageCircle className="text-blue-500" />
          常见问题 (FAQ) 配置
        </h2>
        <div className="text-[10px] bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-mono uppercase tracking-widest">
          Dual-Mode UI Ready
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ================= 左侧：新增表单 ================= */}
        <div className={`${cardClass} h-fit xl:col-span-1`}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg"><Plus size={16}/></div> 
            新增问答录入
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>全局唯一 ID</label>
              <input required placeholder="如: q-deploy" value={formData.id} onChange={e => handleChange('id', e.target.value)} className={inputClass} />
            </div>
            
            <div>
              <label className={labelClass}>用户提问 (Question)</label>
              <input required placeholder="精简的核心问题..." value={formData.question} onChange={e => handleChange('question', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>官方解答 (Answer)</label>
              <textarea required placeholder="详细解答内容..." value={formData.answer} onChange={e => handleChange('answer', e.target.value)} className={`${inputClass} h-28`} />
            </div>

            <div className="p-4 bg-neutral-100/50 dark:bg-black/20 rounded-2xl border border-neutral-200 dark:border-white/5 space-y-4">
              <div>
                <label className={labelClass}>视觉色彩 (Hex)</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={formData.iconColor} onChange={e => handleChange('iconColor', e.target.value)} className="w-10 h-10 cursor-pointer rounded-lg bg-transparent border-0 p-0 shrink-0" />
                  <input value={formData.iconColor} onChange={e => handleChange('iconColor', e.target.value)} className={`${inputClass} font-mono`} />
                </div>
              </div>
              
              <div>
                <label className={labelClass}>SVG 矢量代码</label>
                <textarea required placeholder='<svg>...</svg>' value={formData.iconSvg} onChange={e => handleChange('iconSvg', e.target.value)} className={`${inputClass} font-mono text-xs h-24`} />
              </div>
            </div>

            <div>
              <label className={labelClass}>展示优先级 (数字越小越靠前)</label>
              <input required type="number" value={formData.priority} onChange={e => handleChange('priority', Number(e.target.value))} className={inputClass} />
            </div>
            
            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 mt-2 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? '保存中...' : '提交问答录入'}
            </button>
          </form>
        </div>

        {/* ================= 右侧：FAQ 数据列表 ================= */}
        <div className={`xl:col-span-2 p-6 bg-transparent`}>
          {isLoading ? (
            <div className="text-neutral-500 animate-pulse py-10 flex justify-center items-center h-full tracking-widest uppercase text-sm">Loading Knowledge Base...</div>
          ) : (
            <div className="space-y-4">
              {faqs.map(faq => (
                <div 
                  key={faq.id} 
                  className={`p-5 rounded-2xl transition-all duration-300 relative group flex gap-4 items-start ${
                    faq.enabled 
                      ? 'bg-white/80 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 shadow-sm dark:shadow-none' 
                      : 'bg-neutral-100/50 dark:bg-transparent border border-neutral-200 dark:border-white/5 border-dashed opacity-50 grayscale hover:opacity-80'
                  }`}
                >
                  {/* 左侧图标底座 */}
                  <div 
                    className="w-12 h-12 flex shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-lg mt-1 transition-transform group-hover:scale-110"
                    style={{ color: faq.iconColor, boxShadow: faq.enabled ? `0 4px 20px ${faq.iconColor}20` : 'none' }}
                  >
                    <div className="w-6 h-6 drop-shadow-[0_0_8px_currentColor]" dangerouslySetInnerHTML={{ __html: faq.iconSvg }} />
                  </div>
                  
                  {/* 中间文字内容 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-mono text-neutral-500 bg-neutral-200/60 dark:bg-black/40 px-2 py-0.5 rounded border border-neutral-300 dark:border-white/5">
                        #{faq.priority}
                      </span>
                      <h4 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">{faq.question}</h4>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2">{faq.answer}</p>
                    <div className="text-[10px] text-neutral-400 font-mono mt-3 uppercase tracking-widest">ID: {faq.id}</div>
                  </div>

                  {/* 右侧控制按钮 */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleToggle(faq.id)} 
                      className={`p-2 rounded-lg transition-all flex justify-center items-center ${faq.enabled ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 hover:bg-emerald-200 dark:hover:bg-emerald-500/20' : 'text-neutral-500 bg-neutral-200 dark:bg-white/5 hover:bg-neutral-300 dark:hover:bg-white/10'}`}
                      title={faq.enabled ? '取消展示' : '恢复展示'}
                    >
                      <Power size={16}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(faq.id)} 
                      className="p-2 text-red-500/80 dark:text-red-400/50 hover:text-red-600 dark:hover:text-red-400 bg-red-50 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors rounded-lg flex justify-center items-center"
                      title="彻底删除"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>

                </div>
              ))}
              {faqs.length === 0 && (
                 <div className="text-center py-16 text-neutral-500 dark:text-neutral-600 text-sm bg-neutral-50/50 dark:bg-transparent rounded-2xl border border-dashed border-neutral-200 dark:border-white/10">暂无知识库记录</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
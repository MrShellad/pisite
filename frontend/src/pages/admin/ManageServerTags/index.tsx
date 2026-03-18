// frontend/src/pages/admin/ManageServerTags/index.tsx
import { RefreshCw, Save, Tags, Plus, Search, Trash2, LayoutGrid } from 'lucide-react';
import { useManageServerTags } from './useManageServerTags';

const CATEGORY_MAP = {
  features: { name: '🚀 核心特色', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  mechanics: { name: '⚙️ 玩法机制', color: 'text-orange-600', bg: 'bg-orange-50' },
  elements: { name: '🔮 补充元素', color: 'text-violet-600', bg: 'bg-violet-50' },
  community: { name: '🤝 社区生态', color: 'text-sky-600', bg: 'bg-sky-50' },
};

export default function ManageServerTags() {
  const {
    groupedAndFilteredTags, selectedId, formData, setFormData,
    isLoading, isSaving, searchQuery, setSearchQuery,
    fetchTags, handleSelect, handleCreateNew, handleSave, handleDelete
  } = useManageServerTags();

  const inputClass = 'w-full rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500';
  const cardClass = 'rounded-2xl border border-neutral-200/70 bg-white/85 p-6 shadow-sm backdrop-blur';

  if (isLoading) return <div className="animate-pulse text-neutral-500 p-8">加载字典中...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* 顶部控制台 */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Tags className="text-orange-500" />
            服务器标签字典管理
          </h2>
          <p className="mt-2 text-sm text-neutral-500">在这里管理前台“发现页”可用的图文徽章（新增、修改 SVG 和颜色）。</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="搜索标签名称..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64 rounded-xl border border-neutral-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
          </div>
          <button
            onClick={() => void fetchTags()}
            className="p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:text-orange-600 transition shadow-sm"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 shadow-lg shadow-orange-500/20"
          >
            <Plus size={16} /> 添加新标签
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[400px_1fr]">
        {/* ================= 左侧：字典列表 (按分类分组) ================= */}
        <section className={`${cardClass} flex flex-col h-[calc(100vh-180px)] overflow-hidden !p-0`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {(Object.entries(groupedAndFilteredTags) as [keyof typeof CATEGORY_MAP, typeof groupedAndFilteredTags['features']][]).map(([catKey, items]) => (
              <div key={catKey} className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${CATEGORY_MAP[catKey].bg} ${CATEGORY_MAP[catKey].color} w-fit`}>
                  <LayoutGrid size={14} />
                  <h3 className="text-xs font-bold tracking-widest uppercase">{CATEGORY_MAP[catKey].name}</h3>
                </div>
                
                {items.length === 0 ? (
                  <div className="text-xs text-neutral-400 pl-3">暂无匹配项</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => {
                      const isActive = item.id === selectedId;
                      return (
                        <div key={item.id} className="relative group">
                          <button
                            onClick={() => handleSelect(item)}
                            className={`flex items-center gap-2 w-full p-2 rounded-xl border text-left transition-all ${isActive ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}
                          >
                            <div 
                              className="w-5 h-5 flex items-center justify-center shrink-0"
                              style={{ color: item.color }}
                              dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                            />
                            <span className="text-xs font-bold text-neutral-700 truncate">{item.label}</span>
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); void handleDelete(item.id); }}
                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-white border border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-200 rounded-full shadow-sm transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ================= 右侧：编辑表单 ================= */}
        <section className={`${cardClass} h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar`}>
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-neutral-400">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center"><Tags size={32} /></div>
              <p className="text-sm font-medium">请选择一个标签，或点击右上角添加新标签</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <h3 className="text-lg font-bold text-neutral-900">{selectedId === 'new' ? '✨ 添加新标签' : '📝 编辑标签属性'}</h3>
                {selectedId !== 'new' && <span className="text-xs font-mono text-neutral-400">ID: {selectedId}</span>}
              </div>

              {/* 核心：所见即所得的预览卡片 */}
              <div className="p-6 bg-[radial-gradient(circle_at_center,_#f1f5f9_0%,_#f8fafc_100%)] border border-neutral-200 rounded-3xl flex flex-col items-center justify-center gap-4">
                <span className="text-xs font-bold text-neutral-400 tracking-widest uppercase">前台渲染预览效果</span>
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 shadow-sm transition-all"
                  style={{ borderColor: `${formData.color}40`, color: formData.color }} // 40为透明度
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0" dangerouslySetInnerHTML={{ __html: formData.iconSvg || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>' }} />
                  <span className="text-sm font-bold whitespace-nowrap">{formData.label || '标签名称'}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>归属分类</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                    <option value="features">🚀 核心特色 (Features)</option>
                    <option value="mechanics">⚙️ 玩法机制 (Mechanics)</option>
                    <option value="elements">🔮 补充元素 (Elements)</option>
                    <option value="community">🤝 社区生态 (Community)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>标签名称 (推荐2-6字)</label>
                  <input maxLength={12} placeholder="例如：纯净原版" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>主题颜色</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={formData.color} 
                      onChange={e => setFormData({...formData, color: e.target.value})} 
                      className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 shadow-sm shrink-0" 
                    />
                    <input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className={`${inputClass} font-mono`} placeholder="#10b981" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>显示优先级排序 (越小越靠前)</label>
                  <input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: Number(e.target.value)})} className={inputClass} placeholder="0" />
                </div>
              </div>

              <div>
                <label className={labelClass}>SVG 图标代码 (推荐从 Lucide 获取)</label>
                <textarea 
                  rows={6}
                  value={formData.iconSvg} 
                  onChange={e => setFormData({...formData, iconSvg: e.target.value})} 
                  className={`${inputClass} font-mono text-xs leading-relaxed resize-none`} 
                  placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  <path d="..." />\n</svg>`}
                />
              </div>

              <div className="pt-4 flex justify-end gap-4">
                <button
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3.5 text-sm font-bold tracking-wider text-white transition hover:bg-neutral-800 disabled:opacity-50 shadow-lg"
                >
                  <Save size={18} />
                  {isSaving ? '保存中...' : '保存标签设置'}
                </button>
              </div>

            </div>
          )}
        </section>
      </div>
    </div>
  );
}
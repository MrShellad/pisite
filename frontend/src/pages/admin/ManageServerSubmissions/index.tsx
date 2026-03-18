// frontend/src/pages/admin/ManageServerSubmissions/index.tsx
import { RefreshCw, Save, Server, ShieldCheck, Upload, ImagePlus, Plus, Search, Trash2, CheckCircle2, Circle } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { useManageServerSubmissions } from './useManageServerSubmissions';
import IconTagEditor from '@/pages/ServerSubmission/components/IconTagEditor';
import StringTagEditor from '@/pages/ServerSubmission/components/StringTagEditor';

export default function ManageServerSubmissions() {
  const {
    filteredSubmissions, selectedId, formData, setFormData,
    isLoading, setIsLoading, isSaving, isUploading, tagDict,
    searchQuery, setSearchQuery, filterStatus, setFilterStatus,
    fetchData, handleSelect, handleUpload, handleSave, handleDelete, handleToggleVerify,
    addSocialLink, updateSocialLink, removeSocialLink
  } = useManageServerSubmissions();

  const inputClass = 'w-full rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:bg-white';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500';
  const cardClass = 'rounded-2xl border border-neutral-200/70 bg-white/85 p-6 shadow-sm backdrop-blur';

  if (isLoading) return <div className="animate-pulse text-neutral-500 p-8">Loading submissions...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* 顶部标题与快速筛选 */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
            <Server className="text-orange-500" />
            服务器资料管理
          </h2>
          <p className="mt-2 text-sm text-neutral-500">在此处审核、编辑用户提交的服务器资料。</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="搜索名称或 IP..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64 rounded-xl border border-neutral-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
            />
          </div>
          <button
            onClick={() => { setIsLoading(true); void fetchData(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> 刷新
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
        {/* ================= 左侧：服务器列表 ================= */}
        <section className={`${cardClass} flex flex-col h-[calc(100vh-180px)] overflow-hidden`}>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex bg-neutral-100 p-1 rounded-xl">
              {(['all', 'pending', 'verified'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterStatus === s ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {s === 'all' ? '全部' : s === 'pending' ? '待审' : '已核'}
                </button>
              ))}
            </div>
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">{filteredSubmissions.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">暂无记录</div>
            ) : (
              filteredSubmissions.map((item) => {
                const isActive = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl border transition-all ${isActive ? 'border-orange-300 bg-orange-50/50' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'}`}
                  >
                    <button
                      onClick={() => handleSelect(item)}
                      className="w-full px-4 py-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <img src={item.icon || '/placeholder-icon.png'} className="w-10 h-10 rounded-xl object-cover border border-neutral-200" alt="" />
                          <div>
                            <div className="text-sm font-bold text-neutral-900 line-clamp-1">{item.name || '未命名'}</div>
                            <div className="mt-1 text-xs font-mono text-neutral-500">{item.ip}:{item.port}</div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* 快速操作按钮组 */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleToggleVerify(item.id, item.verified); }}
                        className={`p-2 rounded-lg transition-colors ${item.verified ? 'text-emerald-500 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'}`}
                        title={item.verified ? "撤销审核" : "设为已通过"}
                      >
                        {item.verified ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(item.id); }}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="立即删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {!isActive && item.verified && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ================= 右侧：编辑表单 ================= */}
        <section className={`${cardClass} h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar`}>
          {!formData ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-neutral-400">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                <Server size={32} />
              </div>
              <p className="text-sm font-medium">请在左侧选择一条记录以开始编辑</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 管理员审核控制台 */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                <div>
                  <h4 className="font-bold text-orange-800 text-sm">管理员控制台</h4>
                  <p className="text-xs text-orange-600 mt-1">审核通过后，该服务器将正式在首页展位出现。</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => void handleToggleVerify(selectedId!, formData.verified)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all ${formData.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-orange-200 text-orange-700'}`}
                  >
                    {formData.verified ? <ShieldCheck size={18} /> : <Circle size={18} />}
                    {formData.verified ? '审核已通过' : '标记为待审'}
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl shadow-sm border border-neutral-200">
                    <input
                      type="checkbox"
                      checked={formData.verified}
                      onChange={e => setFormData(prev => prev ? { ...prev, verified: e.target.checked } : prev)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span className="text-xs font-bold text-neutral-600">手动切换状态</span>
                  </label>
                </div>
              </div>

              {/* 视觉资产 */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>服务器 Icon (点击更换)</label>
                  <label className="relative block h-24 w-24 rounded-3xl border-2 border-dashed border-neutral-200 bg-neutral-50 overflow-hidden cursor-pointer group hover:border-orange-500 hover:bg-white transition-all">
                    {formData.icon ? <img src={formData.icon} className="w-full h-full object-cover" alt="icon" /> : <div className="flex h-full items-center justify-center"><ImagePlus size={24} className="text-neutral-300" /></div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"><Upload size={18} /></div>
                    <input type="file" className="hidden" onChange={e => handleUpload(e, 'icon')} disabled={!!isUploading} accept="image/*" />
                  </label>
                </div>
                <div>
                  <label className={labelClass}>Hero 封面大图 (点击更换)</label>
                  <label className="relative block h-24 w-full rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 overflow-hidden cursor-pointer group hover:border-orange-500 hover:bg-white transition-all">
                    {formData.hero ? <img src={formData.hero} className="w-full h-full object-cover" alt="hero" /> : <div className="flex h-full items-center justify-center"><ImagePlus size={24} className="text-neutral-300" /></div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"><Upload size={18} /></div>
                    <input type="file" className="hidden" onChange={e => handleUpload(e, 'hero')} disabled={!!isUploading} accept="image/*" />
                  </label>
                </div>
              </div>

              {/* 基础信息 */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>服务器名称</label>
                  <input placeholder="例如：我的世界生存服" value={formData.name} onChange={e => setFormData(prev => prev ? { ...prev, name: e.target.value } : prev)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>服务器类型</label>
                  <select value={formData.serverType} onChange={e => setFormData(prev => prev ? { ...prev, serverType: e.target.value } : prev)} className={inputClass}>
                    <option value="vanilla">纯净原版</option>
                    <option value="plugin">插件服</option>
                    <option value="modded">模组服</option>
                    <option value="network">群组服/跨服</option>
                  </select>
                </div>
              </div>

              {/* 富文本编辑 */}
              <div>
                <label className={labelClass}>详情介绍 (富文本)</label>
                <div className="bg-white rounded-2xl overflow-hidden border border-neutral-200 focus-within:border-orange-500 transition-colors">
                  <ReactQuill theme="snow" value={formData.description} onChange={val => setFormData(prev => prev ? { ...prev, description: val } : prev)} className="min-h-[220px] pb-12 border-0" />
                </div>
              </div>

              {/* 网络与版本 */}
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>IP 地址 / 域名</label>
                  <input placeholder="play.example.com" value={formData.ip} onChange={e => setFormData(prev => prev ? { ...prev, ip: e.target.value } : prev)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>端口</label>
                  <input type="number" value={formData.port} onChange={e => setFormData(prev => prev ? { ...prev, port: Number(e.target.value) } : prev)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>最大承载人数</label>
                  <input type="number" value={formData.maxPlayers} onChange={e => setFormData(prev => prev ? { ...prev, maxPlayers: Number(e.target.value) } : prev)} className={inputClass} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>兼容版本范围</label>
                  <StringTagEditor tags={formData.versions} validateRegex={/^\d+\.\d+(\.\d+)?(-\w+)?$/} onChange={tags => setFormData(prev => prev ? { ...prev, versions: tags } : prev)} />
                </div>
                <div>
                  <label className={labelClass}>SEO/查询标签</label>
                  <StringTagEditor tags={formData.tags} onChange={tags => setFormData(prev => prev ? { ...prev, tags: tags } : prev)} />
                </div>
              </div>

              {/* 合规与属性 */}
              <div className="grid sm:grid-cols-3 gap-6 items-end">
                <div>
                  <label className={labelClass}>适龄提示</label>
                  <select value={formData.ageRecommendation} onChange={e => setFormData(prev => prev ? { ...prev, ageRecommendation: e.target.value } : prev)} className={inputClass}>
                    <option value="全年龄">全年龄</option><option value="12+">12+</option><option value="16+">16+</option><option value="18+">18+</option>
                  </select>
                </div>
                <div className="sm:col-span-2 pb-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${formData.hasPaidContent ? 'bg-orange-500 border-orange-500' : 'border-neutral-300 group-hover:border-orange-400'}`}>
                      {formData.hasPaidContent && <Plus size={14} className="text-white rotate-45" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={formData.hasPaidContent} onChange={e => setFormData(prev => prev ? { ...prev, hasPaidContent: e.target.checked } : prev)} />
                    <span className="text-sm font-bold text-neutral-700">包含氪金/内购内容</span>
                  </label>
                </div>
              </div>

              {/* 链接配置 */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>官方网站</label>
                  <input placeholder="https://..." value={formData.website} onChange={e => setFormData(prev => prev ? { ...prev, website: e.target.value } : prev)} className={inputClass} />
                </div>
                {formData.serverType === 'modded' && (
                  <div>
                    <label className={labelClass}>整合包下载链接</label>
                    <input placeholder="蓝奏云/网盘/CurseForge" value={formData.modpackUrl} onChange={e => setFormData(prev => prev ? { ...prev, modpackUrl: e.target.value } : prev)} className={inputClass} />
                  </div>
                )}
              </div>

              {/* 社交平台 */}
              <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-200 space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-neutral-800 text-sm flex items-center gap-2">
                    <Plus size={16} className="text-orange-500" /> 社交互动渠道
                  </h4>
                  <button type="button" onClick={addSocialLink} className="text-xs text-orange-600 font-bold hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors">添加新链接</button>
                </div>
                <div className="space-y-3">
                  {formData.socialLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
                      <select value={link.platform} onChange={e => updateSocialLink(idx, 'platform', e.target.value)} className={`${inputClass} !py-2.5 !w-32 shadow-sm`}>
                        <option value="QQ">QQ群/号</option><option value="Discord">Discord</option><option value="B站">Bilibili</option><option value="抖音">抖音</option><option value="微信">微信公众号</option>
                      </select>
                      <input value={link.url} onChange={e => updateSocialLink(idx, 'url', e.target.value)} className={`${inputClass} !py-2.5 shadow-sm`} placeholder="输入群号或完整 URL" />
                      <button type="button" onClick={() => removeSocialLink(idx)} className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                  {formData.socialLinks.length === 0 && <p className="text-xs text-neutral-400 text-center py-2">暂无社交链接</p>}
                </div>

                <div className="pt-5 mt-5 border-t border-neutral-200">
                  <label className="flex items-center gap-2 font-bold text-sm text-neutral-700 cursor-pointer group">
                    <input type="checkbox" checked={formData.hasVoiceChat} onChange={e => setFormData(prev => prev ? { ...prev, hasVoiceChat: e.target.checked } : prev)} className="w-4 h-4 accent-orange-500" />
                    官方推荐语音平台
                  </label>
                  {formData.hasVoiceChat && (
                    <div className="flex gap-3 mt-4 animate-in slide-in-from-top-4">
                      <select value={formData.voicePlatform} onChange={e => setFormData(prev => prev ? { ...prev, voicePlatform: e.target.value } : prev)} className={`${inputClass} !py-2.5 !w-40`}>
                        <option value="QQ">QQ内置语音</option><option value="Discord">Discord</option><option value="oopz">Oopz</option><option value="TeamSpeak">TeamSpeak</option><option value="KOOK">KOOK (原开黑啦)</option>
                      </select>
                      <input value={formData.voiceUrl} onChange={e => setFormData(prev => prev ? { ...prev, voiceUrl: e.target.value } : prev)} className={`${inputClass} !py-2.5`} placeholder="频道 ID 或邀请链接" />
                    </div>
                  )}
                </div>
              </div>

              {/* 分类图文标签 */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-neutral-100" />
                  <h3 className="font-bold text-neutral-400 text-xs uppercase tracking-widest">精细化业务标签</h3>
                  <div className="h-px flex-1 bg-neutral-100" />
                </div>
                <div className="grid gap-6">
                  <IconTagEditor title="🚀 核心特色" tags={formData.features} dictItems={tagDict.filter((t: any) => t.category === 'features')} fallbackColor="#10b981" onChange={tags => setFormData(prev => prev ? { ...prev, features: tags } : prev)} />
                  <IconTagEditor title="⚙️ 玩法机制" tags={formData.mechanics} dictItems={tagDict.filter((t: any) => t.category === 'mechanics')} fallbackColor="#f97316" onChange={tags => setFormData(prev => prev ? { ...prev, mechanics: tags } : prev)} />
                  <IconTagEditor title="🔮 补充元素" tags={formData.elements} dictItems={tagDict.filter((t: any) => t.category === 'elements')} fallbackColor="#8b5cf6" onChange={tags => setFormData(prev => prev ? { ...prev, elements: tags } : prev)} />
                  <IconTagEditor title="🤝 社区生态" tags={formData.community} dictItems={tagDict.filter((t: any) => t.category === 'community')} fallbackColor="#0ea5e9" onChange={tags => setFormData(prev => prev ? { ...prev, community: tags } : prev)} />
                </div>
              </div>

              {/* 底部悬浮保存按钮 */}
              <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-neutral-100 p-6 -mx-6 -mb-6 rounded-b-[28px] flex justify-between items-center shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 text-neutral-400">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs font-medium">上次自动保存: {new Date().toLocaleTimeString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-10 py-4 text-sm font-bold tracking-wider text-white transition-all hover:bg-neutral-800 disabled:opacity-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
                >
                  {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                  {isSaving ? '正在同步数据...' : '确认并保存更改'}
                </button>
              </div>

            </div>
          )}
        </section>
      </div>
    </div>
  );
}
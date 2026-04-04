// frontend/src/pages/admin/ManageSponsors.tsx
import { useState, useEffect } from 'react';
import { Plus, Power, Trash2, Upload } from 'lucide-react';
import { api, getUploadUrl } from '../../api/client';
import type { Sponsor } from '../../types';

const initialFormState = {
  id: '', icon: '', name: '', desc: '', tagsInput: '', price: '', link: '',
  regionsInput: 'cn, global', priority: 1, borderColor: '#3b82f6', backgroundColor: '#0f172a', textColor: '#ffffff',
};

export default function ManageSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSponsors = async () => { try { const res = await api.get<Sponsor[]>('/admin/sponsors/all'); setSponsors(res.data); } catch (err) {} finally { setIsLoading(false); } };
  useEffect(() => { fetchSponsors(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formDataObj = new FormData(); formDataObj.append('file', file);
    setIsUploading(true);
    try { const res = await api.post('/admin/upload', formDataObj); setFormData(prev => ({ ...prev, icon: getUploadUrl(res.data.url) })); } 
    catch (err) { alert('上传失败'); } finally { setIsUploading(false); }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const payload = { ...formData, priority: Number(formData.priority), tags: formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean), regions: formData.regionsInput.split(',').map(t => t.trim()).filter(Boolean), enabled: true };
    try { await api.post('/admin/sponsors', payload); setFormData(initialFormState); fetchSponsors(); } catch (err: any) { alert('添加失败'); } finally { setIsSubmitting(false); }
  };

  const handleToggle = async (id: string) => { try { await api.put(`/admin/sponsors/${id}/toggle`); fetchSponsors(); } catch (err) {} };
  const handleDelete = async (id: string) => { if (!window.confirm('删除？')) return; try { await api.delete(`/admin/sponsors/${id}`); fetchSponsors(); } catch (err) {} };

  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm";
  const labelClass = "block text-xs text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5 uppercase tracking-wider font-semibold";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none";

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide">赞助商配置网络</h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`${cardClass} col-span-1 h-fit`}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4"><div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg"><Plus size={16}/></div> 挂载新赞助商</h3>
          
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>唯一 ID</label><input required value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>排序</label><input required type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: Number(e.target.value)})} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>品牌名</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>价格角标</label><input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>描述</label><input required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>标签 (逗号分隔)</label><input value={formData.tagsInput} onChange={e => setFormData({...formData, tagsInput: e.target.value})} className={inputClass} /></div>
            
            <div className="space-y-2 p-4 bg-neutral-100/50 dark:bg-black/20 rounded-2xl border border-neutral-200 dark:border-white/5">
              <label className="block text-xs text-neutral-500 font-bold">Logo 源</label>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden">
                  {formData.icon ? <img src={formData.icon} className="w-full h-full object-contain p-1" /> : <Upload className="text-neutral-400" size={18} />}
                </div>
                <label className="cursor-pointer px-4 py-2.5 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-neutral-700 dark:text-white transition-all shadow-sm dark:shadow-none">
                  {isUploading ? '正在上传...' : '上传本地图片'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
              <input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="或直接输入外部 URL" className={`${inputClass} mt-2`} />
            </div>
            
            <div><label className={labelClass}>链接</label><input required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className={inputClass} /></div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 mt-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 shadow-lg dark:shadow-none">
              {isSubmitting ? '注册中...' : '注册赞助商'}
            </button>
          </form>
        </div>

        <div className={`${cardClass} col-span-1 xl:col-span-2 flex flex-col`}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 border-b border-neutral-200 dark:border-white/10 pb-4">网络节点监控</h3>
          {isLoading ? <div className="text-neutral-500 animate-pulse py-10 text-center">读取赞助商序列...</div> : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                    <th className="py-4 px-3 font-medium">排序</th><th className="py-4 px-3 font-medium">标识</th><th className="py-4 px-3 font-medium">元数据</th><th className="py-4 px-3 text-center font-medium">节点状态</th><th className="py-4 px-3 text-right font-medium">控制</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsors.map((sponsor) => (
                    <tr key={sponsor.id} className={`border-b border-neutral-100 dark:border-white/5 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02] ${sponsor.enabled ? '' : 'opacity-40'}`}>
                      <td className="py-4 px-3 font-mono text-neutral-500 text-xs">#{sponsor.priority}</td>
                      <td className="py-4 px-3"><div className="flex items-center justify-center w-10 h-10 rounded-xl border border-neutral-200 dark:border-white/10 shadow-sm dark:shadow-lg" style={{ backgroundColor: sponsor.backgroundColor, borderColor: sponsor.borderColor }}><img src={sponsor.icon} alt="icon" className="w-6 h-6 object-contain" /></div></td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-sm" style={{ color: sponsor.textColor }}>{sponsor.name}</div>
                        <div className="flex gap-1.5 mt-2">
                          {sponsor.tags.map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-md text-neutral-600 dark:text-neutral-400">{tag}</span>)}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button onClick={() => handleToggle(sponsor.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all hover:scale-105 ${sponsor.enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-neutral-100 dark:bg-white/5 text-neutral-500 border border-neutral-200 dark:border-white/10'}`}><Power size={12} /> {sponsor.enabled ? 'Online' : 'Offline'}</button>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <button onClick={() => handleDelete(sponsor.id)} className="p-2 text-red-500/80 dark:text-red-400/50 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
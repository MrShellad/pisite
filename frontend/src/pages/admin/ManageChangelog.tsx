// frontend/src/pages/admin/ManageChangelog.tsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, GitCommit, Info, Upload, ShieldCheck, Target, Globe, Users, Percent } from 'lucide-react';
import { api } from '../../api/client';

export default function ManageChangelog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

  // 扩展后的表单数据结构
  const [formData, setFormData] = useState({
    versionId: '',          // v1.2.0
    displayVersion: '',     // v1.2.0 Beta
    date: new Date().toISOString().split('T')[0],
    channel: 'stable',      // stable | preview
    rolloutType: 'all',     // all | grayscale | targeted
    rolloutValue: '',       // 灰度比例(%) 或 UUID列表(逗号分隔)
    allowedRegions: 'ALL',  // ALL 或 CN,US,EU 等
    platforms: {
      darwin: { url: '', signature: '' },
      windows: { url: '', signature: '' },
      linux: { url: '', signature: '' }
    },
    changes: [{ iconSvg: '', iconColor: '#3b82f6', text: '' }]
  });

  const fetchLogs = async () => {
    const res = await api.get('/admin/changelog'); // 建议后台拉取所有，包含隐藏/回滚版本
    setLogs(res.data);
  };
  useEffect(() => { fetchLogs(); }, []);

  // 文件上传处理 (重用之前的 /admin/upload 接口)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, platform: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(prev => ({ ...prev, [platform]: true }));
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    try {
      const res = await api.post('/admin/upload', formDataObj, { headers: { 'Content-Type': 'multipart/form-data' }});
      setFormData(prev => ({
        ...prev,
        platforms: { ...prev.platforms, [platform]: { ...prev.platforms[platform as keyof typeof prev.platforms], url: `http://localhost:3000${res.data.url}` } }
      }));
    } catch (err) {
      alert('包上传失败，请检查网络');
    } finally {
      setIsUploading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleAddChange = () => { setFormData({ ...formData, changes: [...formData.changes, { iconSvg: '', iconColor: '#10b981', text: '' }] }); };
  const updateChange = (index: number, field: string, value: string) => {
    const newChanges = [...formData.changes]; newChanges[index] = { ...newChanges[index], [field]: value }; setFormData({ ...formData, changes: newChanges });
  };
  const removeChange = (index: number) => { setFormData({ ...formData, changes: formData.changes.filter((_, i) => i !== index) }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try { 
      await api.post('/admin/changelog', formData); 
      alert('版本发布成功！');
      fetchLogs(); 
    } 
    catch (err) { alert('发布失败'); } finally { setIsSubmitting(false); }
  };

  const handleRollback = async (id: string) => {
    if (window.confirm('警告：回滚将撤回此版本的所有更新推送！确定执行？')) {
      await api.post(`/admin/changelog/${id}/rollback`);
      fetchLogs();
    }
  };

  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm";
  const labelClass = "block text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative shadow-sm dark:shadow-none mb-6";

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
        <GitCommit className="text-blue-500" /> 版本发布与分发中心 (Tauri Updater)
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* 左侧：发布表单 */}
        <div>
          <form onSubmit={handleSubmit}>
            
            {/* 模块1：基础信息 */}
            <div className={cardClass}>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-500"/> 基础版本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>版本号 (必须遵循 SemVer)</label><input required placeholder="1.2.0" value={formData.versionId} onChange={e => setFormData({...formData, versionId: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>发布日期</label><input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>展示名称</label><input required placeholder="v1.2.0 (性能优化版)" value={formData.displayVersion} onChange={e => setFormData({...formData, displayVersion: e.target.value})} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>发布通道</label>
                  <select value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value})} className={inputClass}>
                    <option value="stable">Stable (正式通道)</option>
                    <option value="preview">Preview (预览/Pro专属)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 模块2：安装包与签名 (Tauri 核心) */}
            <div className={cardClass}>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500"/> 构建产物与签名 (.sig)</h3>
              <div className="space-y-6">
                {['darwin', 'windows', 'linux'].map(os => (
                  <div key={os} className="p-4 bg-neutral-50/50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold capitalize">{os === 'darwin' ? 'macOS (Universal)' : os} 包配置</span>
                      {/* 上传按钮 */}
                      <label className="cursor-pointer px-3 py-1.5 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 rounded-lg text-xs font-bold text-neutral-700 dark:text-white transition-all">
                        {isUploading[os] ? '上传中...' : <span className="flex items-center gap-1"><Upload size={14}/> 直传服务器</span>}
                        <input type="file" accept=".zip,.tar.gz,.msi" className="hidden" onChange={e => handleFileUpload(e, os)} disabled={isUploading[os]} />
                      </label>
                    </div>
                    <input placeholder={`直链 URL 或外部存储地址 (支持 .zip, .tar.gz)`} value={(formData.platforms as any)[os].url} onChange={e => setFormData({...formData, platforms: {...formData.platforms, [os]: {...(formData.platforms as any)[os], url: e.target.value}}})} className={inputClass} />
                    <input placeholder={`Tauri Updater 签名内容 (xxx.sig 文件内容)`} value={(formData.platforms as any)[os].signature} onChange={e => setFormData({...formData, platforms: {...formData.platforms, [os]: {...(formData.platforms as any)[os], signature: e.target.value}}})} className={`${inputClass} font-mono text-xs`} />
                  </div>
                ))}
              </div>
            </div>

            {/* 模块3：高级发布策略 */}
            <div className={cardClass}>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2"><Target size={16} className="text-purple-500"/> 高级推送策略</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setFormData({...formData, rolloutType: 'all'})} className={`py-2 rounded-lg text-xs font-bold border ${formData.rolloutType === 'all' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/20 dark:border-blue-500/50' : 'bg-transparent border-neutral-200 dark:border-white/10 text-neutral-500'}`}><Globe size={14} className="inline mr-1"/> 全网推送</button>
                  <button type="button" onClick={() => setFormData({...formData, rolloutType: 'grayscale'})} className={`py-2 rounded-lg text-xs font-bold border ${formData.rolloutType === 'grayscale' ? 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-500/20 dark:border-purple-500/50' : 'bg-transparent border-neutral-200 dark:border-white/10 text-neutral-500'}`}><Percent size={14} className="inline mr-1"/> 灰度发布</button>
                  <button type="button" onClick={() => setFormData({...formData, rolloutType: 'targeted'})} className={`py-2 rounded-lg text-xs font-bold border ${formData.rolloutType === 'targeted' ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-500/20 dark:border-orange-500/50' : 'bg-transparent border-neutral-200 dark:border-white/10 text-neutral-500'}`}><Users size={14} className="inline mr-1"/> 特定 UUID</button>
                </div>

                {formData.rolloutType === 'grayscale' && (
                  <div><label className={labelClass}>灰度比例 (1-100)</label><input type="number" min="1" max="100" placeholder="例如: 30" value={formData.rolloutValue} onChange={e => setFormData({...formData, rolloutValue: e.target.value})} className={inputClass} /></div>
                )}
                
                {formData.rolloutType === 'targeted' && (
                  <div><label className={labelClass}>目标设备 UUID 列表 (英文逗号分隔)</label><textarea placeholder="uuid-1234, uuid-5678" value={formData.rolloutValue} onChange={e => setFormData({...formData, rolloutValue: e.target.value})} className={`${inputClass} h-20`} /></div>
                )}

                <div><label className={labelClass}>允许更新的地区 (ISO代码，ALL代表全球)</label><input placeholder="ALL 或 CN,US,JP" value={formData.allowedRegions} onChange={e => setFormData({...formData, allowedRegions: e.target.value})} className={inputClass} /></div>
              </div>
            </div>

            {/* 模块4：日志生成 (原有逻辑优化) */}
            <div className={cardClass}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">更新日志详情</h3></div>
              {formData.changes.map((item, i) => (
                <div key={i} className="flex gap-2 items-start mb-3">
                  <input type="color" value={item.iconColor} onChange={e => updateChange(i, 'iconColor', e.target.value)} className="w-8 h-8 rounded shrink-0 border-0 p-0" />
                  <div className="flex-1 space-y-2">
                    <input placeholder="SVG" value={item.iconSvg} onChange={e => updateChange(i, 'iconSvg', e.target.value)} className={`${inputClass} font-mono text-xs py-2`} />
                    <input placeholder="文字描述" value={item.text} onChange={e => updateChange(i, 'text', e.target.value)} className={`${inputClass} py-2`} />
                  </div>
                  <button type="button" onClick={() => removeChange(i)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                </div>
              ))}
              <button type="button" onClick={handleAddChange} className="w-full py-2 border border-dashed border-neutral-300 dark:border-white/20 text-xs font-bold rounded-lg mt-2">+ 追加条目</button>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98]">
              {isSubmitting ? '正在发布并签名...' : '🚀 确认发布至 Tauri 更新中心'}
            </button>
          </form>
        </div>

        {/* 右侧：版本历史与管控 */}
        <div className="space-y-4">
          <h3 className="font-bold text-xl text-neutral-900 dark:text-white mb-6">版本控制台</h3>
          {logs.map((log: any) => (
            <div key={log.id} className={`p-5 border ${log.status === 'rollback' ? 'border-red-500/30 bg-red-50/50 dark:bg-red-500/5 opacity-70' : 'border-neutral-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01]'} rounded-2xl relative shadow-sm`}>
              
              <div className="flex justify-between items-start mb-4 border-b border-neutral-100 dark:border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xl text-neutral-900 dark:text-white">{log.version}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${log.channel === 'preview' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>{log.channel}</span>
                    {log.status === 'rollback' && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-600">已回滚</span>}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono flex gap-2">
                    <span>{log.date}</span> | <span>策略: {log.rolloutType} {log.rolloutValue}</span>
                  </div>
                </div>
                {log.status !== 'rollback' && (
                  <button onClick={() => handleRollback(log.id)} className="text-xs px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-bold">撤回/回滚</button>
                )}
              </div>
              
              {/* 日志内容展示 */}
              <div className="space-y-2 opacity-80">
                {log.changes?.map((item: any, i: number) => (
                   <div key={i} className="text-sm flex gap-2 items-center text-neutral-600 dark:text-neutral-400">
                     <span style={{ color: item.iconColor }} dangerouslySetInnerHTML={{ __html: item.iconSvg }} className="w-4 h-4"/>
                     {item.text}
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
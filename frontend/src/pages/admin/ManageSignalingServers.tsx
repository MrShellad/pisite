import { Plus, Trash2, Power, Server } from 'lucide-react';
import { useManageSignalingServers } from './hooks/useManageSignalingServers';

export default function ManageSignalingServers() {
  const { servers, isLoading, isSubmitting, formData, handleChange, handleSubmit, handleToggle, handleDelete } = useManageSignalingServers();

  const inputClass = "w-full px-4 py-3 bg-neutral-100/50 dark:bg-black/40 border border-neutral-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-blue-50/50 dark:focus:bg-blue-500/5 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 transition-all text-sm";
  const labelClass = "block text-xs text-neutral-500 dark:text-neutral-400 ml-1 mb-1.5 uppercase tracking-wider font-semibold";
  const cardClass = "p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
          <Server className="text-blue-500" /> 信令服务器调度
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`${cardClass} h-fit xl:col-span-1`}>
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 pb-4">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg"><Plus size={16}/></div> 添加信令节点
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className={labelClass}>节点 ID</label><input required value={formData.id} onChange={e => handleChange('id', e.target.value)} className={inputClass} placeholder="例如: cn-1" /></div>
            <div><label className={labelClass}>WebSocket URL</label><input required value={formData.url} onChange={e => handleChange('url', e.target.value)} className={inputClass} placeholder="wss://..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>区域 (Region)</label><input required value={formData.region} onChange={e => handleChange('region', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>服务商 (Provider)</label><input required value={formData.provider} onChange={e => handleChange('provider', e.target.value)} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>优先级 (Priority)</label><input required type="number" value={formData.priority} onChange={e => handleChange('priority', Number(e.target.value))} className={inputClass} /></div>
              <div><label className={labelClass}>权重 (Weight)</label><input required type="number" value={formData.weight} onChange={e => handleChange('weight', Number(e.target.value))} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>最大连接数</label><input required type="number" value={formData.limitsMaxConnections} onChange={e => handleChange('limitsMaxConnections', Number(e.target.value))} className={inputClass} /></div>
              <div><label className={labelClass}>安全通道 (WSS/TLS)</label><select value={formData.secure ? 'true' : 'false'} onChange={e => handleChange('secure', e.target.value === 'true')} className={inputClass}><option value="true">开启 (Yes)</option><option value="false">关闭 (No)</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>支持 P2P</label><select value={formData.featuresP2p ? 'true' : 'false'} onChange={e => handleChange('featuresP2p', e.target.value === 'true')} className={inputClass}><option value="true">开启</option><option value="false">关闭</option></select></div>
              <div><label className={labelClass}>支持 Relay (中继)</label><select value={formData.featuresRelay ? 'true' : 'false'} onChange={e => handleChange('featuresRelay', e.target.value === 'true')} className={inputClass}><option value="true">开启</option><option value="false">关闭</option></select></div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 mt-2 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200">
              {isSubmitting ? '保存中...' : '注册信令节点'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-2 p-6 bg-transparent">
          {isLoading ? <div className="text-neutral-500 animate-pulse">Loading Servers...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {servers.map(s => (
                <div key={s.id} className={`p-5 rounded-2xl transition-all duration-300 relative overflow-hidden group flex flex-col ${s.enabled ? 'bg-white/80 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 shadow-sm dark:shadow-none' : 'bg-neutral-100/50 dark:bg-transparent border border-neutral-200 dark:border-white/5 border-dashed opacity-50 grayscale hover:opacity-80'}`}>
                  
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-orange-100 dark:bg-black/40 border border-orange-200 dark:border-white/5 shadow-sm dark:shadow-lg transition-transform group-hover:scale-110 text-orange-500">
                        <Server size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white uppercase tracking-wider">{s.id}</h4>
                        <p className="text-xs font-mono text-neutral-500">{s.region} | {s.provider}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggle(s.id)} className={`p-2 rounded-lg transition-all ${s.enabled ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-neutral-500 bg-neutral-200 dark:bg-white/5'}`}><Power size={16}/></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500/80 dark:text-red-400/50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="relative z-10 flex-1 space-y-2 text-sm text-neutral-800 dark:text-neutral-300 font-mono bg-neutral-100 dark:bg-black/20 p-3 rounded-xl border border-neutral-200 dark:border-white/5">
                    <p className="truncate" title={s.url}><span className="text-blue-500 mr-2">URL</span>{s.url}</p>
                    <div className="flex justify-between items-center text-xs text-neutral-500">
                       <span>Secure: {s.secure ? '✅' : '❌'}</span>
                       <span>P2P: {s.featuresP2p ? '✅' : '❌'}</span>
                       <span>Relay: {s.featuresRelay ? '✅' : '❌'}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-between items-center relative z-10">
                    <div className="text-[10px] font-mono text-neutral-500 bg-neutral-200/60 dark:bg-black/40 px-2 py-1 rounded border border-neutral-300 dark:border-white/5">
                      Priority: {s.priority} | WT: {s.weight} | MAX_CONN: {s.limitsMaxConnections}
                    </div>
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

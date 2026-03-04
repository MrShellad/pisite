// frontend/src/pages/admin/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Download, Users, Zap, TrendingUp, Monitor, Apple, Terminal } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(res => setStats(res.data)).catch(console.error);
  }, []);

  if (!stats) return <div className="text-neutral-500 animate-pulse">Syncing Telemetry...</div>;

  const getPlatformIcon = (name: string) => {
    if (name.toLowerCase().includes('mac')) return <Apple size={16} />;
    if (name.toLowerCase().includes('win')) return <Monitor size={16} />;
    return <Terminal size={16} />;
  };

  const CardShell = ({ children, className = "" }: any) => (
    <div className={`p-6 bg-white/80 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-xl shadow-sm dark:shadow-none transition-colors duration-500 ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <CardShell>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl"></div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit rounded-lg mb-4 border border-blue-100 dark:border-transparent"><Download size={20}/></div>
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">{stats.totalDownloads}</h3>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">总下载量</p>
        </CardShell>
        <CardShell>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl"></div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit rounded-lg mb-4 border border-indigo-100 dark:border-transparent"><Users size={20}/></div>
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">{stats.uniqueDownloads}</h3>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">独立设备</p>
        </CardShell>
        <CardShell>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-2xl"></div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit rounded-lg mb-4 border border-emerald-100 dark:border-transparent"><Zap size={20}/></div>
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">{stats.totalActivations}</h3>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">激活装机</p>
        </CardShell>
        <CardShell>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-2xl"></div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit rounded-lg mb-4 border border-purple-100 dark:border-transparent"><TrendingUp size={20}/></div>
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
            {stats.uniqueDownloads > 0 ? ((stats.totalActivations / stats.uniqueDownloads) * 100).toFixed(1) : '0.0'}%
          </h3>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">转化率</p>
        </CardShell>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <CardShell className="xl:col-span-2 h-[400px] flex flex-col">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-6">七日流量趋势 (7D)</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyTrends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.15} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#eee', borderRadius: '12px', color: '#000' }} />
                <Area type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={3} fill="url(#colorDl)" />
                <Area type="monotone" dataKey="activations" stroke="#10b981" strokeWidth={3} fill="url(#colorAc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-6">平台分布占比</h3>
          <div className="space-y-6">
            {stats.platformDownloads.map((item: any, i: number) => {
              const pct = Math.round((item.count / stats.totalDownloads) * 100);
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 font-medium">{getPlatformIcon(item.platform)} {item.platform}</span>
                    <span className="text-neutral-900 dark:text-white font-mono font-bold">{item.count} <span className="text-neutral-400 dark:text-neutral-600 ml-1 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardShell>
      </div>
    </div>
  );
}
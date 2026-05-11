import { useEffect, useState } from 'react';
import { Plus, Power, Trash2, Upload } from 'lucide-react';

import { api, getUploadUrl } from '../../api/client';
import type { Sponsor } from '../../types';
import { useAdminFeedback } from './components/AdminFeedback';

const initialFormState = {
  id: '',
  icon: '',
  name: '',
  desc: '',
  tagsInput: '',
  price: '',
  link: '',
  regionsInput: 'cn, global',
  priority: 1,
  borderColor: '#3b82f6',
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
};

export default function ManageSponsors() {
  const { confirm, notify } = useAdminFeedback();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSponsors = async () => {
    try {
      const res = await api.get<Sponsor[]>('/admin/sponsors/all');
      setSponsors(res.data);
    } catch (err) {
      console.error(err);
      notify('赞助商读取失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSponsors();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formDataObj = new FormData();
    formDataObj.append('file', file);
    setIsUploading(true);
    try {
      const res = await api.post<{ url: string }>('/admin/upload', formDataObj);
      setFormData(prev => ({ ...prev, icon: getUploadUrl(res.data.url) }));
      notify('Logo 已上传', '请保存赞助商配置使改动生效。', 'success');
    } catch (err) {
      console.error(err);
      notify('Logo 上传失败', '请重新选择图片后再试。', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const payload = {
      ...formData,
      priority: Number(formData.priority),
      tags: formData.tagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
      regions: formData.regionsInput.split(',').map(region => region.trim()).filter(Boolean),
      enabled: true,
    };

    try {
      await api.post('/admin/sponsors', payload);
      setFormData(initialFormState);
      await fetchSponsors();
      notify('赞助商已添加', '新的赞助商配置已保存。', 'success');
    } catch (err) {
      console.error(err);
      notify('赞助商添加失败', '请检查 ID 是否重复或字段是否完整。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/sponsors/${id}/toggle`);
      await fetchSponsors();
    } catch (err) {
      console.error(err);
      notify('赞助商状态切换失败', '请稍后重试。', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除赞助商',
      description: `确定要删除赞助商 ${id} 吗？前台赞助商区域会立即移除它。`,
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/sponsors/${id}`);
      await fetchSponsors();
      notify('赞助商已删除', '该赞助商已从配置中移除。', 'success');
    } catch (err) {
      console.error(err);
      notify('赞助商删除失败', '请稍后重试。', 'error');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500/50 focus:bg-blue-50/50 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder-neutral-600 dark:focus:bg-blue-500/5';
  const labelClass = 'mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';
  const cardClass =
    'rounded-xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';

  return (
    <div className="space-y-8 pb-12">
      <h2 className="text-2xl font-bold tracking-wide text-neutral-900 dark:text-white">赞助商配置</h2>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className={`${cardClass} h-fit`}>
          <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
            <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Plus size={16} />
            </div>
            添加赞助商
          </h3>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>唯一 ID</label>
                <input required value={formData.id} onChange={event => setFormData({ ...formData, id: event.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>排序</label>
                <input required type="number" value={formData.priority} onChange={event => setFormData({ ...formData, priority: Number(event.target.value) })} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>品牌名</label>
                <input required value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>价格角标</label>
                <input required value={formData.price} onChange={event => setFormData({ ...formData, price: event.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>描述</label>
              <input required value={formData.desc} onChange={event => setFormData({ ...formData, desc: event.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>标签，逗号分隔</label>
              <input value={formData.tagsInput} onChange={event => setFormData({ ...formData, tagsInput: event.target.value })} className={inputClass} />
            </div>

            <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-100/50 p-4 dark:border-white/5 dark:bg-black/20">
              <label className="block text-xs font-bold text-neutral-500">Logo</label>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5">
                  {formData.icon ? <img src={formData.icon} className="h-full w-full object-contain p-1" alt="" /> : <Upload className="text-neutral-400" size={18} />}
                </div>
                <label className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-none dark:hover:bg-white/10">
                  {isUploading ? '正在上传...' : '上传本地图片'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
              <input value={formData.icon} onChange={event => setFormData({ ...formData, icon: event.target.value })} placeholder="或直接输入外部 URL" className={`${inputClass} mt-2`} />
            </div>

            <div>
              <label className={labelClass}>链接</label>
              <input required value={formData.link} onChange={event => setFormData({ ...formData, link: event.target.value })} className={inputClass} />
            </div>

            <button type="submit" disabled={isSubmitting} className="mt-4 w-full rounded-lg bg-neutral-900 py-3.5 font-bold text-white shadow-lg transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black dark:shadow-none dark:hover:bg-neutral-200">
              {isSubmitting ? '保存中...' : '添加赞助商'}
            </button>
          </form>
        </div>

        <div className={`${cardClass} flex flex-col xl:col-span-2`}>
          <h3 className="mb-6 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">赞助商列表</h3>
          {isLoading ? (
            <div className="animate-pulse py-10 text-center text-neutral-500">正在读取赞助商...</div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse whitespace-nowrap text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:text-neutral-500">
                    <th className="px-3 py-4 font-medium">排序</th>
                    <th className="px-3 py-4 font-medium">标识</th>
                    <th className="px-3 py-4 font-medium">元数据</th>
                    <th className="px-3 py-4 text-center font-medium">状态</th>
                    <th className="px-3 py-4 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsors.map(sponsor => (
                    <tr key={sponsor.id} className={`border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-white/5 dark:hover:bg-white/[0.02] ${sponsor.enabled ? '' : 'opacity-50'}`}>
                      <td className="px-3 py-4 font-mono text-xs text-neutral-500">#{sponsor.priority}</td>
                      <td className="px-3 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 shadow-sm dark:border-white/10 dark:shadow-lg" style={{ backgroundColor: sponsor.backgroundColor, borderColor: sponsor.borderColor }}>
                          <img src={sponsor.icon} alt="" className="h-6 w-6 object-contain" />
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-bold" style={{ color: sponsor.textColor }}>{sponsor.name}</div>
                        <div className="mt-2 flex gap-1.5">
                          {sponsor.tags.map(tag => (
                            <span key={tag} className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button type="button" onClick={() => void handleToggle(sponsor.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition hover:scale-105 ${sponsor.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-white/10 dark:bg-white/5'}`}>
                          <Power size={12} />
                          {sponsor.enabled ? 'Online' : 'Offline'}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button type="button" onClick={() => void handleDelete(sponsor.id)} className="rounded-lg p-2 text-red-500/80 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400/60 dark:hover:bg-red-500/10 dark:hover:text-red-300" aria-label={`删除 ${sponsor.name}`}>
                          <Trash2 size={16} />
                        </button>
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

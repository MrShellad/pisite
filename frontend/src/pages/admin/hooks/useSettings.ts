import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import type { SiteSettings } from '../types/settings';

export function useSettings() {
  const [formData, setFormData] = useState<SiteSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { api.get('/settings').then(res => setFormData(res.data)); }, []);

  const handleChange = (field: keyof SiteSettings, value: string) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try { await api.put('/admin/settings', formData); alert('全局设置已生效！'); } 
    catch (err) { alert('更新失败'); } finally { setIsSaving(false); }
  };

  return { formData, isSaving, handleChange, handleSubmit };
}
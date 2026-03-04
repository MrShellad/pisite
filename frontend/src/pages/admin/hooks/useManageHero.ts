// frontend/src/pages/admin/hooks/useManageHero.ts
import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import type { HeroFormData } from '../types/hero';

export function useManageHero() {
  const [formData, setFormData] = useState<HeroFormData>({
    id: '1', logoUrl: '', logoColor: '#3b82f6', title: '', subtitle: '', 
    description: '', buttonText: '', updateDate: '',
    dlMac: '', dlWin: '', dlLinux: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // 【新增】上传状态

  useEffect(() => {
    api.get('/hero')
      .then(res => {
        // 兼容旧数据：如果后端还没改名，把旧的 logoSvg 映射过来
        const data = res.data;
        setFormData({ ...data, logoUrl: data.logoUrl || data.logoSvg || '' });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (field: keyof HeroFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 【新增】图片上传逻辑
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    setIsUploading(true);
    try {
      const res = await api.post('/admin/upload', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // 拼接后端返回的图片地址
      const imageUrl = res.data.url.startsWith('/') ? res.data.url : `/${res.data.url}`;
        handleChange('logoUrl', `http://localhost:3000${imageUrl}`);
    } catch (err) {
      alert('图片上传失败，请检查后端服务');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/admin/hero', formData);
      alert('首屏配置部署成功！官网已实时同步。');
    } catch (err) {
      alert('更新失败，请检查网络或日志。');
    } finally {
      setIsSaving(false);
    }
  };

  return { formData, isSaving, isLoading, isUploading, handleChange, handleFileUpload, handleSubmit };
}
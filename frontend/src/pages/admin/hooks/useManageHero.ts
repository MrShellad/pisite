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
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    api.get('/hero')
      .then(res => {
        const data = res.data;
        setFormData({ ...data, logoUrl: data.logoUrl || data.logoSvg || '' });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (field: keyof HeroFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 本地文件 → dataURL 预览（不依赖后端上传接口）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleChange('logoUrl', reader.result);
        }
      };
      reader.readAsDataURL(file);
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
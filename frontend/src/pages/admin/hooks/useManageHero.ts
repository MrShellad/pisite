// frontend/src/pages/admin/hooks/useManageHero.ts
import { useEffect, useState } from 'react';

import { api } from '../../../api/client';
import { useAdminFeedback } from '../components/AdminFeedback';
import type { HeroFormData } from '../types/hero';

type HeroApiResponse = HeroFormData & {
  flatpakScript?: string;
  logoSvg?: string;
};

function getTodayDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function useManageHero() {
  const { notify } = useAdminFeedback();
  const [formData, setFormData] = useState<HeroFormData>({
    id: '1',
    logoUrl: '',
    logoColor: '#3b82f6',
    title: '',
    subtitle: '',
    description: '',
    buttonText: '',
    titleEn: '',
    subtitleEn: '',
    descriptionEn: '',
    buttonTextEn: '',
    updateDate: getTodayDate(),
    dlMac: '',
    dlWin: '',
    dlLinux: '',
    steamDeckSourceUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    api
      .get('/hero')
      .then(res => {
        const data = res.data as HeroApiResponse;
        const { flatpakScript, logoSvg, ...heroConfig } = data;
        setFormData({
          ...heroConfig,
          logoUrl: data.logoUrl || logoSvg || '',
          titleEn: data.titleEn || '',
          subtitleEn: data.subtitleEn || '',
          descriptionEn: data.descriptionEn || '',
          buttonTextEn: data.buttonTextEn || '',
          updateDate: getTodayDate(),
          steamDeckSourceUrl: data.steamDeckSourceUrl || flatpakScript || '',
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (field: keyof HeroFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/admin/hero', formData);
      notify('Hero 已保存', '首页 Hero 配置已更新。', 'success');
    } catch (error) {
      console.error(error);
      notify('Hero 保存失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return { formData, isSaving, isLoading, isUploading, handleChange, handleFileUpload, handleSubmit };
}

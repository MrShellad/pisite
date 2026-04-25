// frontend/src/pages/admin/hooks/useManageHero.ts
import { useEffect, useState } from 'react';

import { api } from '../../../api/client';
import type { HeroFormData } from '../types/hero';

function getTodayDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function useManageHero() {
  const [formData, setFormData] = useState<HeroFormData>({
    id: '1',
    logoUrl: '',
    logoColor: '#3b82f6',
    title: '',
    subtitle: '',
    description: '',
    buttonText: '',
    updateDate: getTodayDate(),
    dlMac: '',
    dlWin: '',
    dlLinux: '',
    flatpakScript: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    api
      .get('/hero')
      .then(res => {
        const data = res.data;
        setFormData({
          ...data,
          logoUrl: data.logoUrl || data.logoSvg || '',
          updateDate: getTodayDate(),
          flatpakScript: data.flatpakScript || '',
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
      alert('Hero config saved successfully.');
    } catch (error) {
      console.error(error);
      alert('Failed to update Hero config. Please check the network or server logs.');
    } finally {
      setIsSaving(false);
    }
  };

  return { formData, isSaving, isLoading, isUploading, handleChange, handleFileUpload, handleSubmit };
}

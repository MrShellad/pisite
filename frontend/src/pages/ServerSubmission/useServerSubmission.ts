// frontend/src/pages/ServerSubmission/useServerSubmission.ts
import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom'; // 【新增】引入路由跳转
import { api } from '@/api/client';
import { initialFormState, type ServerSubmissionFormState } from './types';

const BACKEND_ORIGIN = 'http://localhost:3000';
const toPreviewUrl = (url: string) => !url ? '' : url.startsWith('http') ? url : `${BACKEND_ORIGIN}${url}`;

export interface ServerTagDict {
  id: string;
  category: string;
  label: string;
  iconSvg: string;
  color: string;
}

export function useServerSubmission() {
  const navigate = useNavigate(); // 【新增】实例化跳转方法
  const [formData, setFormData] = useState<ServerSubmissionFormState>(initialFormState);
  const [isUploading, setIsUploading] = useState<'icon' | 'hero' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tagDict, setTagDict] = useState<ServerTagDict[]>([]);

  useEffect(() => {
    api.get('/server-tags-dict')
      .then(res => setTagDict(res.data))
      .catch(err => console.error('获取标签字典失败', err));
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, field: 'icon' | 'hero') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(field);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await api.post<{ url: string }>('/server-submissions/upload-cover', payload, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      setFormData(current => ({ ...current, [field]: toPreviewUrl(response.data.url) }));
    } catch {
      setError(`上传失败，请稍后再试。`);
    } finally {
      setIsUploading(null);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!formData.name.trim() || !formData.ip.trim() || !formData.hero.trim() || !formData.icon.trim()) {
      setError('请填完带 * 的必填项，并上传头图和图标。');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/server-submissions', formData);
      
      // 【修改】提交成功后，不再只是显示 Message，而是直接带上缓存数据跳转！
      navigate('/servers/submit/success', { state: { serverData: formData } });
      
    } catch {
      setError('提交失败，请检查字段后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    isUploading,
    isSubmitting,
    message,
    tagDict,
    error,
    handleUpload,
    handleSubmit
  };
}
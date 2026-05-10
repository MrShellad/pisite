// frontend/src/pages/admin/hooks/useManageFeatures.ts
import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import type {
  Feature,
  FeatureFormData,
  FeatureScreenshot,
  FeatureScreenshotFormData,
} from '../types/features';

export function useManageFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [screenshots, setScreenshots] = useState<FeatureScreenshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScreenshotSubmitting, setIsScreenshotSubmitting] = useState(false);
  const [uploadingScreenshotId, setUploadingScreenshotId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FeatureFormData>({
    id: '', iconSvg: '', iconColor: '#3b82f6', title: '', desc: '', priority: 1
  });
  const [screenshotFormData, setScreenshotFormData] = useState<FeatureScreenshotFormData>({
    imageUrl: '',
    title: '',
    caption: '',
    priority: 1,
  });

  const fetchData = async () => {
    try {
      const [featuresRes, screenshotsRes] = await Promise.all([
        api.get<Feature[]>('/admin/features/all'),
        api.get<FeatureScreenshot[]>('/admin/features/screenshots'),
      ]);
      setFeatures(featuresRes.data);
      setScreenshots(screenshotsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (field: keyof FeatureFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScreenshotFormChange = (
    field: keyof FeatureScreenshotFormData,
    value: string | number,
  ) => {
    setScreenshotFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/features', { ...formData, enabled: true });
      setFormData({ id: '', iconSvg: '', iconColor: '#3b82f6', title: '', desc: '', priority: 1 });
      fetchData();
    } catch (err) {
      alert('添加特性失败，请检查 ID 是否重复。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/features/${id}/toggle`);
      fetchData();
    } catch (err) {
      alert('状态切换失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要彻底删除该特性吗？此操作不可逆！')) {
      try {
        await api.delete(`/admin/features/${id}`);
        fetchData();
      } catch (err) {
        alert('删除失败');
      }
    }
  };

  const uploadScreenshotAsset = async (file: File) => {
    const payload = new FormData();
    payload.append('file', file);
    const response = await api.post<{ url: string }>('/admin/upload', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  };

  const handleScreenshotUpload = async (file: File, id?: string) => {
    setUploadingScreenshotId(id ?? 'new');
    try {
      const imageUrl = await uploadScreenshotAsset(file);
      if (id) {
        setScreenshots(prev =>
          prev.map(item => (item.id === id ? { ...item, imageUrl } : item)),
        );
      } else {
        setScreenshotFormData(prev => ({ ...prev, imageUrl }));
      }
    } catch (err) {
      alert('截图上传失败，请重试。');
    } finally {
      setUploadingScreenshotId(null);
    }
  };

  const handleScreenshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScreenshotSubmitting(true);
    try {
      await api.post('/admin/features/screenshots', screenshotFormData);
      setScreenshotFormData({ imageUrl: '', title: '', caption: '', priority: screenshots.length + 2 });
      fetchData();
    } catch (err) {
      alert('添加截图失败，请检查图片地址。');
    } finally {
      setIsScreenshotSubmitting(false);
    }
  };

  const updateScreenshotDraft = (
    id: string,
    field: keyof FeatureScreenshotFormData,
    value: string | number,
  ) => {
    setScreenshots(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleScreenshotSave = async (item: FeatureScreenshot) => {
    try {
      await api.put(`/admin/features/screenshots/${item.id}`, {
        imageUrl: item.imageUrl,
        title: item.title,
        caption: item.caption,
        priority: Number(item.priority),
      });
      fetchData();
    } catch (err) {
      alert('截图保存失败。');
    }
  };

  const handleScreenshotDelete = async (id: string) => {
    if (!window.confirm('确定要删除这张截图吗？')) return;
    try {
      await api.delete(`/admin/features/screenshots/${id}`);
      fetchData();
    } catch (err) {
      alert('截图删除失败。');
    }
  };

  return { 
    features,
    screenshots,
    isLoading,
    isSubmitting,
    isScreenshotSubmitting,
    uploadingScreenshotId,
    formData,
    screenshotFormData,
    handleChange,
    handleScreenshotFormChange,
    handleSubmit,
    handleToggle,
    handleDelete,
    handleScreenshotUpload,
    handleScreenshotSubmit,
    updateScreenshotDraft,
    handleScreenshotSave,
    handleScreenshotDelete,
  };
}

// frontend/src/pages/admin/hooks/useManageFeatures.ts
import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import type { Feature, FeatureFormData } from '../types/features';

export function useManageFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FeatureFormData>({
    id: '', iconSvg: '', iconColor: '#3b82f6', title: '', desc: '', priority: 1
  });

  const fetchFeatures = async () => {
    try {
      const res = await api.get('/admin/features/all');
      setFeatures(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleChange = (field: keyof FeatureFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/features', { ...formData, enabled: true });
      setFormData({ id: '', iconSvg: '', iconColor: '#3b82f6', title: '', desc: '', priority: 1 });
      fetchFeatures();
    } catch (err) {
      alert('添加特性失败，请检查 ID 是否重复。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/features/${id}/toggle`);
      fetchFeatures();
    } catch (err) {
      alert('状态切换失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要彻底删除该特性吗？此操作不可逆！')) {
      try {
        await api.delete(`/admin/features/${id}`);
        fetchFeatures();
      } catch (err) {
        alert('删除失败');
      }
    }
  };

  return { 
    features, isLoading, isSubmitting, formData, 
    handleChange, handleSubmit, handleToggle, handleDelete 
  };
}
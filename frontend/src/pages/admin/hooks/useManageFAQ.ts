// frontend/src/pages/admin/hooks/useManageFAQ.ts
import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import type { Faq, FaqFormData } from '../types/faq';

export function useManageFAQ() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FaqFormData>({
    id: '', question: '', answer: '', iconSvg: '', iconColor: '#3b82f6', priority: 1
  });

  const fetchFaqs = async () => {
    try {
      const res = await api.get('/admin/faqs/all');
      setFaqs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  // 泛型保证字段名和值类型的一致性
  const handleChange = (field: keyof FaqFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/faqs', { ...formData, enabled: true });
      setFormData({ id: '', question: '', answer: '', iconSvg: '', iconColor: '#3b82f6', priority: 1 });
      fetchFaqs();
    } catch (err) {
      alert('添加失败，请检查问题 ID 是否重复。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/faqs/${id}/toggle`);
      fetchFaqs();
    } catch (err) {
      alert('状态切换失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要彻底删除该问题吗？此操作不可逆！')) {
      try {
        await api.delete(`/admin/faqs/${id}`);
        fetchFaqs();
      } catch (err) {
        alert('删除失败');
      }
    }
  };

  return {
    faqs, isLoading, isSubmitting, formData,
    handleChange, handleSubmit, handleToggle, handleDelete
  };
}
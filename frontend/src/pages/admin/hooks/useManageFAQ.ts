import { useCallback, useEffect, useState } from 'react';

import { api } from '../../../api/client';
import { DEFAULT_FAQ_ICON } from '../faqIconPresets';
import { useAdminFeedback } from '../components/AdminFeedback';
import type { Faq, FaqFormData } from '../types/faq';

const initialFormData: FaqFormData = {
  id: '',
  question: '',
  answer: '',
  iconSvg: DEFAULT_FAQ_ICON.svg,
  iconColor: '#3b82f6',
  priority: 1,
};

export function useManageFAQ() {
  const { confirm, notify } = useAdminFeedback();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FaqFormData>(initialFormData);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await api.get('/admin/faqs/all');
      setFaqs(res.data);
    } catch (err) {
      console.error(err);
      notify('FAQ 读取失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void fetchFaqs();
  }, [fetchFaqs]);

  const handleChange = (field: keyof FaqFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/faqs', { ...formData, enabled: true });
      setFormData(initialFormData);
      await fetchFaqs();
      notify('FAQ 已添加', '新的问答条目已保存。', 'success');
    } catch (err) {
      console.error(err);
      notify('FAQ 添加失败', '请检查问题 ID 是否重复。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/faqs/${id}/toggle`);
      await fetchFaqs();
    } catch (err) {
      console.error(err);
      notify('FAQ 状态切换失败', '请稍后重试。', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除 FAQ',
      description: '确定要彻底删除该问题吗？此操作不可逆。',
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/faqs/${id}`);
      await fetchFaqs();
      notify('FAQ 已删除', '该问题已从列表中移除。', 'success');
    } catch (err) {
      console.error(err);
      notify('FAQ 删除失败', '请稍后重试。', 'error');
    }
  };

  return {
    faqs,
    isLoading,
    isSubmitting,
    formData,
    handleChange,
    handleSubmit,
    handleToggle,
    handleDelete,
  };
}

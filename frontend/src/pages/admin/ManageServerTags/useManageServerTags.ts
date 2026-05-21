import { useEffect, useMemo, useState } from 'react';

import { api } from '@/api/client';
import { useAdminFeedback } from '../components/AdminFeedback';

export interface ServerTagDict {
  id: string;
  category: string;
  label: string;
  iconSvg: string;
  color: string;
  priority: number;
}

export type TagFormData = Omit<ServerTagDict, 'id'>;

const initialFormData: TagFormData = {
  category: 'features',
  label: '',
  iconSvg: '',
  color: '#10b981',
  priority: 0,
};

export function useManageServerTags() {
  const { confirm, notify } = useAdminFeedback();
  const [tags, setTags] = useState<ServerTagDict[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TagFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ServerTagDict[]>('/server-tags-dict');
      setTags(response.data.sort((a, b) => a.priority - b.priority));
    } catch (err) {
      console.error('Failed to fetch server tag dictionary', err);
      notify('标签字典读取失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTags();
  }, []);

  const handleSelect = (tag: ServerTagDict) => {
    setSelectedId(tag.id);
    setFormData({
      category: tag.category,
      label: tag.label,
      iconSvg: tag.iconSvg,
      color: tag.color,
      priority: tag.priority,
    });
  };

  const handleCreateNew = () => {
    setSelectedId('new');
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.label.trim() || !formData.iconSvg.trim()) {
      notify('无法保存标签', '请填写标签名称和 SVG 代码。', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (selectedId === 'new') {
        await api.post('/admin/server-tags-dict', formData);
        notify('标签已添加', '新的服务器标签已保存。', 'success');
      } else {
        await api.put(`/admin/server-tags-dict/${selectedId}`, formData);
        notify('标签已保存', '服务器标签配置已更新。', 'success');
      }
      await fetchTags();
      setSelectedId(null);
    } catch (err) {
      console.error('Failed to save server tag dictionary item', err);
      notify('标签保存失败', '请检查数据格式。', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除服务器标签',
      description: '确定要删除这个标签吗？正在使用该标签的服务器将失去此项展示。',
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/server-tags-dict/${id}`);
      setTags(prev => prev.filter(tag => tag.id !== id));
      if (selectedId === id) setSelectedId(null);
      notify('标签已删除', '该标签已从字典中移除。', 'success');
    } catch (err) {
      console.error('Failed to delete server tag dictionary item', err);
      notify('标签删除失败', '请稍后重试。', 'error');
    }
  };

  const groupedAndFilteredTags = useMemo(() => {
    const filtered = tags.filter(tag => tag.label.toLowerCase().includes(searchQuery.toLowerCase()));

    return {
      features: filtered.filter(tag => tag.category === 'features'),
      mechanics: filtered.filter(tag => tag.category === 'mechanics'),
      elements: filtered.filter(tag => tag.category === 'elements'),
      community: filtered.filter(tag => tag.category === 'community'),
    };
  }, [tags, searchQuery]);

  return {
    tags,
    groupedAndFilteredTags,
    selectedId,
    setSelectedId,
    formData,
    setFormData,
    isLoading,
    isSaving,
    searchQuery,
    setSearchQuery,
    fetchTags,
    handleSelect,
    handleCreateNew,
    handleSave,
    handleDelete,
  };
}

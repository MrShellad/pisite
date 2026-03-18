// frontend/src/pages/admin/ManageServerTags/useManageServerTags.ts
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/client';

export interface ServerTagDict {
  id: string;
  category: string; // 'features' | 'mechanics' | 'elements' | 'community'
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
      // 按 priority 和 id 排序
      const sorted = response.data.sort((a, b) => a.priority - b.priority);
      setTags(sorted);
    } catch (err) {
      console.error('获取标签字典失败', err);
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
      alert('请填写标签名称和 SVG 代码');
      return;
    }
    
    setIsSaving(true);
    try {
      if (selectedId === 'new') {
        // 新增 (注意：这里需要你的后端配合提供 POST /admin/server-tags-dict 接口)
        await api.post('/admin/server-tags-dict', formData);
        alert('添加成功！');
      } else {
        // 修改 (需要后端配合提供 PUT /admin/server-tags-dict/:id 接口)
        await api.put(`/admin/server-tags-dict/${selectedId}`, formData);
        alert('修改成功！');
      }
      await fetchTags();
      setSelectedId(null);
    } catch (err) {
      alert('保存失败，请检查数据格式。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个标签吗？前端使用该标签的服务器将失去此项展示。')) return;
    try {
      // 删除 (需要后端配合提供 DELETE /admin/server-tags-dict/:id 接口)
      await api.delete(`/admin/server-tags-dict/${id}`);
      setTags(prev => prev.filter(t => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      alert('删除失败');
    }
  };

  // 分组并过滤数据
  const groupedAndFilteredTags = useMemo(() => {
    const filtered = tags.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return {
      features: filtered.filter(t => t.category === 'features'),
      mechanics: filtered.filter(t => t.category === 'mechanics'),
      elements: filtered.filter(t => t.category === 'elements'),
      community: filtered.filter(t => t.category === 'community'),
    };
  }, [tags, searchQuery]);

  return {
    tags, groupedAndFilteredTags,
    selectedId, setSelectedId,
    formData, setFormData,
    isLoading, isSaving,
    searchQuery, setSearchQuery,
    fetchTags, handleSelect, handleCreateNew, handleSave, handleDelete
  };
}
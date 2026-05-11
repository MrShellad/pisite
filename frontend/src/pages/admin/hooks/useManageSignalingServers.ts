import { useEffect, useState } from 'react';

import { api } from '../../../api/client';
import { useAdminFeedback } from '../components/AdminFeedback';

export interface SignalingServer {
  id: string;
  url: string;
  region: string;
  provider: string;
  priority: number;
  weight: number;
  secure: boolean;
  featuresP2p: boolean;
  featuresRelay: boolean;
  limitsMaxConnections: number;
  enabled: boolean;
}

const initialFormData = {
  id: '',
  url: '',
  region: 'CN',
  provider: 'official',
  priority: 100,
  weight: 1,
  secure: true,
  featuresP2p: true,
  featuresRelay: false,
  limitsMaxConnections: 1000,
  enabled: true,
};

export function useManageSignalingServers() {
  const { confirm, notify } = useAdminFeedback();
  const [servers, setServers] = useState<SignalingServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const fetchServers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/signaling-servers');
      setServers(res.data);
    } catch (error) {
      console.error('Failed to fetch signaling servers', error);
      notify('信令服务器读取失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchServers();
  }, []);

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/admin/signaling-servers', formData);
      setFormData(initialFormData);
      await fetchServers();
      notify('信令服务器已添加', '新的信令节点已保存。', 'success');
    } catch (error) {
      console.error('Failed to create signaling server', error);
      notify('信令服务器添加失败', '请检查字段后重试。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/signaling-servers/${id}/toggle`);
      setServers(prev => prev.map(server => (server.id === id ? { ...server, enabled: !server.enabled } : server)));
    } catch (error) {
      console.error('Failed to toggle signaling server', error);
      notify('信令服务器状态切换失败', '请稍后重试。', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除信令服务器',
      description: `确定要删除信令服务器 ${id} 吗？客户端将不再收到该节点。`,
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/signaling-servers/${id}`);
      await fetchServers();
      notify('信令服务器已删除', '该节点已从配置中移除。', 'success');
    } catch (error) {
      console.error('Failed to delete signaling server', error);
      notify('信令服务器删除失败', '请稍后重试。', 'error');
    }
  };

  return {
    servers,
    isLoading,
    isSubmitting,
    formData,
    handleChange,
    handleSubmit,
    handleToggle,
    handleDelete,
  };
}

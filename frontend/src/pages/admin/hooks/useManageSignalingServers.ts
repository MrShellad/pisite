import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

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

export function useManageSignalingServers() {
  const [servers, setServers] = useState<SignalingServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
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
  });

  const fetchServers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/signaling-servers');
      setServers(res.data);
    } catch (error) {
      console.error('Failed to fetch signaling servers', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/admin/signaling-servers', formData);
      setFormData({
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
      });
      fetchServers();
    } catch (error) {
      console.error('Failed to create signaling server', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/signaling-servers/${id}/toggle`);
      setServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      );
    } catch (error) {
      console.error('Failed to toggle signaling server', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signaling server?')) return;
    try {
      await api.delete(`/admin/signaling-servers/${id}`);
      fetchServers();
    } catch (error) {
      console.error('Failed to delete signaling server', error);
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

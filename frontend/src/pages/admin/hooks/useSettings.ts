import { useEffect, useState } from 'react';

import { api } from '../../../api/client';
import type { ManagedFriendLink, SiteSettings, SiteSettingsFormData } from '../types/settings';

function createFriendLinkId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `friend-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFriendLinks(items: ManagedFriendLink[] | undefined) {
  return (items ?? []).map((item, index) => ({
    id: item.id || createFriendLinkId(),
    name: item.name || '',
    href: item.href || '',
    enabled: item.enabled ?? true,
    sortOrder: item.sortOrder ?? index,
  }));
}

export function useSettings() {
  const [formData, setFormData] = useState<SiteSettingsFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get<SiteSettings>('/settings'), api.get<ManagedFriendLink[]>('/admin/friends')])
      .then(([settingsRes, friendsRes]) => {
        setFormData({
          ...settingsRes.data,
          friendLinks: normalizeFriendLinks(friendsRes.data),
        });
      })
      .catch(console.error);
  }, []);

  const handleChange = (field: keyof SiteSettings, value: string) => {
    setFormData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleFriendChange = (index: number, field: keyof ManagedFriendLink, value: string | boolean) => {
    setFormData(prev => {
      if (!prev) return prev;

      const friendLinks = [...prev.friendLinks];
      friendLinks[index] = { ...friendLinks[index], [field]: value };
      return { ...prev, friendLinks };
    });
  };

  const addFriendLink = () => {
    setFormData(prev =>
      prev
        ? {
            ...prev,
            friendLinks: [
              ...prev.friendLinks,
              { id: createFriendLinkId(), name: '', href: '', enabled: true, sortOrder: prev.friendLinks.length },
            ],
          }
        : prev,
    );
  };

  const removeFriendLink = (index: number) => {
    setFormData(prev =>
      prev
        ? {
            ...prev,
            friendLinks: prev.friendLinks.filter((_, currentIndex) => currentIndex !== index),
          }
        : prev,
    );
  };

  const moveFriendLink = (index: number, direction: -1 | 1) => {
    setFormData(prev => {
      if (!prev) return prev;

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.friendLinks.length) {
        return prev;
      }

      const friendLinks = [...prev.friendLinks];
      const [current] = friendLinks.splice(index, 1);
      friendLinks.splice(targetIndex, 0, current);

      return { ...prev, friendLinks };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData) return;

    setIsSaving(true);
    try {
      const { friendLinks, ...settingsPayload } = formData;
      await api.put('/admin/settings', settingsPayload);
      await api.put(
        '/admin/friends',
        friendLinks.map(item => ({
          id: item.id,
          name: item.name.trim(),
          href: item.href.trim(),
          enabled: item.enabled,
        })),
      );
      alert('全局设置与友情链接已保存。');
    } catch (error) {
      console.error(error);
      alert('更新失败，请检查网络或服务端日志。');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    isSaving,
    handleChange,
    handleFriendChange,
    addFriendLink,
    removeFriendLink,
    moveFriendLink,
    handleSubmit,
  };
}

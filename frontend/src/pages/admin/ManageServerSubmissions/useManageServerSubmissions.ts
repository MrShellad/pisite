import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';

import { api, getUploadUrl } from '@/api/client';
import { normalizeMcVersionId } from '@/lib/minecraft';
import type {
  ServerPingBatchRunResult,
  ServerPingConfig,
  ServerSubmission,
  ServerSubmissionFormState,
  SocialLink,
} from '@/types';

export interface AdminServerSubmissionFormState extends ServerSubmissionFormState {
  sortId: number;
  verified: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
}

function toFormState(item: ServerSubmission): AdminServerSubmissionFormState {
  return {
    sortId: Number(item.sortId ?? 0),
    name: item.name || '',
    description: item.description || '',
    ip: item.ip || '',
    port: item.port || 25565,
    versions: Array.isArray(item.versions) ? item.versions : [],
    maxPlayers: item.maxPlayers || 100,
    onlinePlayers: item.onlinePlayers || 0,
    icon: getUploadUrl(item.icon || ''),
    hero: getUploadUrl(item.hero || ''),
    contactEmail: item.contactEmail || '',
    website: item.website || '',
    serverType: item.serverType || 'vanilla',
    language: item.language || 'zh-CN',
    modpackUrl: item.modpackUrl || '',
    hasPaidContent: item.hasPaidContent || false,
    ageRecommendation: item.ageRecommendation || '全年龄',
    socialLinks: Array.isArray(item.socialLinks) ? item.socialLinks : [],
    hasVoiceChat: item.hasVoiceChat || false,
    voicePlatform: item.voicePlatform || 'QQ',
    voiceUrl: item.voiceUrl || '',
    features: Array.isArray(item.features) ? item.features : [],
    mechanics: Array.isArray(item.mechanics) ? item.mechanics : [],
    elements: Array.isArray(item.elements) ? item.elements : [],
    community: Array.isArray(item.community) ? item.community : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    verified: !!item.verified,
    emailVerified: !!item.emailVerified,
    emailVerifiedAt: item.emailVerifiedAt || null,
  };
}

function buildSubmissionEmailDraft(item: ServerSubmission) {
  const safeName = (item.name || '未命名服务器').trim();
  return {
    subject: `关于您提交的服务器「${safeName}」`,
    body:
      `您好，\n\n` +
      `这里是 PiSite 管理团队。我们正在处理您提交的服务器「${safeName}」。\n\n` +
      `如果需要补充信息，请直接回复这封邮件，我们会尽快跟进。\n\n` +
      `感谢支持。`,
  };
}

function extractApiErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === 'object') {
    const message = (data as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }

    const err = (data as Record<string, unknown>).error;
    if (typeof err === 'string' && err.trim()) {
      return err.trim();
    }
  }

  return null;
}

export function useManageServerSubmissions() {
  const [submissions, setSubmissions] = useState<ServerSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdminServerSubmissionFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<'icon' | 'hero' | null>(null);
  const [isSavingPingConfig, setIsSavingPingConfig] = useState(false);
  const [isRunningPingJob, setIsRunningPingJob] = useState(false);
  const [tagDict, setTagDict] = useState<any[]>([]);
  const [pingConfig, setPingConfig] = useState<ServerPingConfig | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('all');

  const fetchData = async () => {
    try {
      const [submissionsRes, pingConfigRes] = await Promise.all([
        api.get<ServerSubmission[]>('/admin/server-submissions'),
        api.get<ServerPingConfig>('/admin/server-status/config'),
      ]);

      setSubmissions(submissionsRes.data);
      setPingConfig(pingConfigRes.data);

      api
        .get('/server-tags-dict')
        .then((res) => setTagDict(res.data))
        .catch(() => {});

      const nextSelectedId =
        selectedId && submissionsRes.data.some((item) => item.id === selectedId)
          ? selectedId
          : submissionsRes.data[0]?.id ?? null;

      setSelectedId(nextSelectedId);
      const selectedItem = submissionsRes.data.find((item) => item.id === nextSelectedId);
      if (selectedItem) {
        setFormData(toFormState(selectedItem));
        const draft = buildSubmissionEmailDraft(selectedItem);
        setEmailSubject(draft.subject);
        setEmailBody(draft.body);
      } else {
        setFormData(null);
        setEmailSubject('');
        setEmailBody('');
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesSearch =
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ip || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'verified'
            ? item.verified
            : !item.verified;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchQuery, filterStatus]);

  const handleSelect = (item: ServerSubmission) => {
    setSelectedId(item.id);
    setFormData(toFormState(item));
    const draft = buildSubmissionEmailDraft(item);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, field: 'icon' | 'hero') => {
    const file = event.target.files?.[0];
    if (!file || !formData) return;

    setIsUploading(field);
    try {
      const payload = new FormData();
      payload.append('file', file);
      const response = await api.post<{ url: string }>('/server-submissions/upload-cover', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData({ ...formData, [field]: getUploadUrl(response.data.url) });
    } catch (err) {
      console.error('Upload failed:', err);
      window.alert('上传失败');
    } finally {
      setIsUploading(null);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedId || !formData) return;
    setIsSaving(true);
    try {
      await api.put(`/admin/server-submissions/${selectedId}`, {
        ...formData,
        sortId: Math.max(0, Number(formData.sortId || 0)),
        name: (formData.name || '').trim(),
        ip: (formData.ip || '').trim(),
        port: Number(formData.port),
        contactEmail: (formData.contactEmail || '').trim().toLowerCase(),
        versions: (formData.versions || []).map((item) => normalizeMcVersionId(item)),
        modpackUrl: formData.serverType === 'modded' ? (formData.modpackUrl || '').trim() : '',
        socialLinks: (formData.socialLinks || []).filter(
          (item) => item.platform.trim() && item.url.trim(),
        ),
      });
      window.alert('保存成功！');
      await fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      window.alert('保存失败，请检查字段后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedId || !formData) return;
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject || !body) {
      window.alert('请填写邮件主题和正文。');
      return;
    }

    setIsSendingEmail(true);
    try {
      await api.post(`/admin/server-submissions/${selectedId}/send-email`, { subject, body });
      window.alert(`邮件已发送到 ${formData.contactEmail || '提交者邮箱'}`);
    } catch (err) {
      console.error('Failed to send submission email:', err);
      const message = extractApiErrorMessage(err) ?? '邮件发送失败，请检查 SMTP 配置后重试。';
      window.alert(message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleToggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/server-submissions/${id}/toggle-verify`);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, verified: !currentStatus } : item)),
      );
      if (selectedId === id) {
        setFormData((prev) => (prev ? { ...prev, verified: !currentStatus } : null));
      }
    } catch (err) {
      console.error('Toggle verify failed:', err);
      window.alert('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该服务器记录吗？此操作不可逆。')) return;
    try {
      await api.delete(`/admin/server-submissions/${id}`);
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setFormData(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      window.alert('删除失败');
    }
  };

  const updatePingConfigField = (key: keyof ServerPingConfig, value: string | number | boolean) => {
    setPingConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value } as ServerPingConfig;
    });
  };

  const handleSavePingConfig = async () => {
    if (!pingConfig) return;
    setIsSavingPingConfig(true);
    try {
      await api.put('/admin/server-status/config', {
        enabled: pingConfig.enabled,
        intervalSeconds: Number(pingConfig.intervalSeconds),
        batchSize: Number(pingConfig.batchSize),
        timeoutMs: Number(pingConfig.timeoutMs),
        ttlSeconds: Number(pingConfig.ttlSeconds),
      });
      await fetchData();
      window.alert('Server ping schedule saved.');
    } catch (err) {
      console.error('Failed to save ping config:', err);
      window.alert('Failed to save server ping schedule.');
    } finally {
      setIsSavingPingConfig(false);
    }
  };

  const handleRunPingBatch = async () => {
    setIsRunningPingJob(true);
    try {
      const res = await api.post<ServerPingBatchRunResult>('/admin/server-status/run');
      await fetchData();
      window.alert(`Ping batch done: ${res.data.processedServers}/${res.data.totalServers}`);
    } catch (err) {
      console.error('Failed to run ping batch:', err);
      window.alert('Failed to run ping batch.');
    } finally {
      setIsRunningPingJob(false);
    }
  };

  const addSocialLink = () =>
    setFormData((current) =>
      current
        ? {
            ...current,
            socialLinks: [...(current.socialLinks || []), { platform: 'QQ', url: '' }],
          }
        : current,
    );

  const updateSocialLink = (index: number, key: keyof SocialLink, value: string) => {
    setFormData((current) =>
      current
        ? {
            ...current,
            socialLinks: (current.socialLinks || []).map((item, i) =>
              i === index ? { ...item, [key]: value } : item,
            ),
          }
        : current,
    );
  };

  const removeSocialLink = (index: number) => {
    setFormData((current) =>
      current
        ? {
            ...current,
            socialLinks: (current.socialLinks || []).filter((_, i) => i !== index),
          }
        : current,
    );
  };

  return {
    submissions,
    filteredSubmissions,
    selectedId,
    formData,
    setFormData,
    isLoading,
    setIsLoading,
    isSaving,
    isUploading,
    isSavingPingConfig,
    isRunningPingJob,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    isSendingEmail,
    tagDict,
    pingConfig,
    updatePingConfigField,
    handleSavePingConfig,
    handleRunPingBatch,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    fetchData,
    handleSelect,
    handleUpload,
    handleSave,
    handleSendEmail,
    handleDelete,
    handleToggleVerify,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
  };
}

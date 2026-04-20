// frontend/src/pages/admin/ManageServerSubmissions/useManageServerSubmissions.ts
import { useState, useEffect, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { api, getUploadUrl } from '@/api/client';
import { normalizeMcVersionId } from '@/lib/minecraft';
import type {
  ServerPingBatchRunResult,
  ServerPingConfig,
  ServerSubmission,
  ServerSubmissionFormState,
  SocialLink
} from '@/types';

export interface AdminServerSubmissionFormState extends ServerSubmissionFormState {
  sortId: number;
  verified: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
}

// 将后端的 ServerSubmission 实体转换为表单状态
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
    features: Array.isArray(item.features) ? item.features : [],
    mechanics: Array.isArray(item.mechanics) ? item.mechanics : [],
    elements: Array.isArray(item.elements) ? item.elements : [],
    community: Array.isArray(item.community) ? item.community : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    socialLinks: Array.isArray(item.socialLinks) ? item.socialLinks : [],
    hasVoiceChat: item.hasVoiceChat || false,
    voicePlatform: item.voicePlatform || 'QQ',
    voiceUrl: item.voiceUrl || '',
    verified: item.verified || false,
    emailVerified: item.emailVerified || false,
    emailVerifiedAt: item.emailVerifiedAt || null,
  };
}

function buildSubmissionEmailDraft(item: ServerSubmission) {
  const safeName = (item.name || '未命名服务器').trim();
  return {
    subject: `关于您提交的服务器「${safeName}」`,
    body:
      `您好，\n\n` +
      `这里是 PiSite 管理员团队。我们正在处理您提交的服务器「${safeName}」。\n\n` +
      `请根据需要回复此邮件补充信息，我们会尽快跟进。\n\n` +
      `谢谢。`,
  };
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

  // 筛选与搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('all');

  // 拉取列表与字典
  const fetchData = async () => {
    try {
      api.get('/server-tags-dict').then(res => setTagDict(res.data)).catch(() => { });
      const response = await api.get<ServerSubmission[]>('/admin/server-submissions');
      const pingConfigRes = await api.get<ServerPingConfig>('/admin/server-status/config');
      setSubmissions(response.data);
      setPingConfig(pingConfigRes.data);

      if (response.data.length && !selectedId) {
        const firstItem = response.data[0];
        setSelectedId(firstItem.id);
        setFormData(toFormState(firstItem));
        const draft = buildSubmissionEmailDraft(firstItem);
        setEmailSubject(draft.subject);
        setEmailBody(draft.body);
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

  // 快速审批切换
  const handleToggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/server-submissions/${id}/toggle-verify`);
      setSubmissions(prev => prev.map(item => item.id === id ? { ...item, verified: !currentStatus } : item));
      if (selectedId === id) {
        setFormData(prev => prev ? { ...prev, verified: !currentStatus } : null);
      }
    } catch {
      alert('操作失败');
    }
  };

  // 快速删除
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该服务器记录吗？此操作不可逆。')) return;
    try {
      await api.delete(`/admin/server-submissions/${id}`);
      setSubmissions(prev => prev.filter(item => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setFormData(null);
      }
    } catch {
      alert('删除失败');
    }
  };

  // 基于计算属性的快速筛选列表
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(item => {
      const matchesSearch =
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ip || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' ? true :
          filterStatus === 'verified' ? item.verified : !item.verified;

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
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, [field]: getUploadUrl(response.data.url) });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('上传失败');
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
        description: formData.description,
        ip: (formData.ip || '').trim(),
        port: Number(formData.port),
        contactEmail: (formData.contactEmail || '').trim().toLowerCase(),
        versions: (formData.versions || []).map((item) => normalizeMcVersionId(item)),
        modpackUrl: formData.serverType === 'modded' ? (formData.modpackUrl || '').trim() : '',
        socialLinks: (formData.socialLinks || []).filter(item => item.platform.trim() && item.url.trim()),
      });
      window.alert('保存成功！');
      await fetchData();
    } catch {
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
      await api.post(`/admin/server-submissions/${selectedId}/send-email`, {
        subject,
        body,
      });
      window.alert(`邮件已发送到 ${formData.contactEmail || '提交者邮箱'}`);
    } catch (err) {
      console.error('Failed to send submission email:', err);
      window.alert('邮件发送失败，请检查 SMTP 配置。');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const updatePingConfigField = (key: keyof ServerPingConfig, value: string | number | boolean) => {
    setPingConfig(prev => {
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

  const addSocialLink = () => setFormData(c => c ? ({ ...c, socialLinks: [...(c.socialLinks || []), { platform: 'QQ', url: '' }] }) : c);
  const updateSocialLink = (index: number, key: keyof SocialLink, value: string) => {
    setFormData(c => c ? ({ ...c, socialLinks: (c.socialLinks || []).map((item, i) => i === index ? { ...item, [key]: value } : item) }) : c);
  };
  const removeSocialLink = (index: number) => setFormData(c => c ? ({ ...c, socialLinks: (c.socialLinks || []).filter((_, i) => i !== index) }) : c);

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
    removeSocialLink
  };
}

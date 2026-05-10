import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import axios from 'axios';

import { api, getUploadUrl } from '@/api/client';
import { normalizeMcVersionId } from '@/lib/minecraft';
import type { ServerTagDict } from '@/pages/ServerSubmission/useServerSubmission';
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

type ToastTone = 'success' | 'error' | 'info';

export type ServerSubmissionToast = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

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
  const [tagDict, setTagDict] = useState<ServerTagDict[]>([]);
  const [pingConfig, setPingConfig] = useState<ServerPingConfig | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified'>('all');
  const [toasts, setToasts] = useState<ServerSubmissionToast[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const toastTimersRef = useRef<number[]>([]);
  const fetchRequestIdRef = useRef(0);
  const verifyingIdsRef = useRef<Set<string>>(new Set());
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach(timerId => window.clearTimeout(timerId));
    };
  }, []);

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const pushToast = (title: string, description: string | undefined, tone: ToastTone) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, title, description, tone }]);
    const timerId = window.setTimeout(() => dismissToast(id), tone === 'error' ? 5200 : 3600);
    toastTimersRef.current.push(timerId);
  };

  const fetchData = async () => {
    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;

    try {
      const [submissionsRes, pingConfigRes] = await Promise.all([
        api.get<ServerSubmission[]>('/admin/server-submissions'),
        api.get<ServerPingConfig>('/admin/server-status/config'),
      ]);

      if (requestId !== fetchRequestIdRef.current) return;

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
      if (requestId === fetchRequestIdRef.current) {
        console.error('Failed to fetch submissions:', err);
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setIsLoading(false);
      }
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
      pushToast('上传失败', '请重新选择图片后再试。', 'error');
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
      pushToast('保存成功', '服务器资料已更新。', 'success');
      await fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      pushToast('保存失败', '请检查字段后重试。', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async (): Promise<boolean> => {
    if (!selectedId || !formData) return false;
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject || !body) {
      pushToast('无法发送邮件', '请填写邮件主题和正文。', 'error');
      return false;
    }

    setIsSendingEmail(true);
    try {
      await api.post(`/admin/server-submissions/${selectedId}/send-email`, { subject, body }, { timeout: 30000 });
      pushToast('邮件已发送', `已发送到 ${formData.contactEmail || '提交者邮箱'}。`, 'success');
      return true;
    } catch (err) {
      console.error('Failed to send submission email:', err);
      const isTimeout = axios.isAxiosError(err) && err.code === 'ECONNABORTED';
      const message =
        extractApiErrorMessage(err) ??
        (isTimeout
          ? '邮件发送请求超时。SMTP 测试正常时，多半是服务器到 SMTP 的握手或投递耗时过长，请稍后重试或检查 Docker 网络出口。'
          : '邮件发送失败，请检查 SMTP 配置后重试。');
      pushToast('邮件发送失败', message, 'error');
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleToggleVerify = async (id: string, currentStatus: boolean) => {
    if (verifyingIdsRef.current.has(id)) return;

    verifyingIdsRef.current.add(id);
    setVerifyingIds(new Set(verifyingIdsRef.current));

    try {
      const requestedVerified = !currentStatus;
      const response = await api.put<{
        verified: boolean;
        ownerCodeSent: boolean;
        ownerCodeAlreadyIssued?: boolean;
        mailError?: string | null;
      }>(`/admin/server-submissions/${id}/toggle-verify`, { verified: requestedVerified });
      const nextVerified = response.data.verified;
      setSubmissions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, verified: nextVerified } : item)),
      );
      if (selectedId === id) {
        setFormData((prev) => (prev ? { ...prev, verified: nextVerified } : null));
      }
      if (!currentStatus) {
        if (response.data.ownerCodeSent) {
          pushToast('已通过审核', '服务器管理 Code 已发送给作者。', 'success');
        } else if (response.data.ownerCodeAlreadyIssued) {
          pushToast('已通过审核', '该服务器已签发过管理 Code，本次不重复发送。', 'info');
        } else {
          pushToast(
            '已通过审核，但 Code 邮件发送失败',
            response.data.mailError || '请检查 SMTP 配置或服务器网络。',
            'error',
          );
        }
      } else {
        pushToast('已撤销审核', '该服务器已从公开展示中移除。', 'info');
      }
      await fetchData();
    } catch (err) {
      console.error('Toggle verify failed:', err);
      pushToast('操作失败', '审核状态切换失败，请稍后重试。', 'error');
    } finally {
      verifyingIdsRef.current.delete(id);
      setVerifyingIds(new Set(verifyingIdsRef.current));
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await api.delete(`/admin/server-submissions/${id}`);
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setFormData(null);
      }
      pushToast('已删除服务器记录', '该操作已完成。', 'success');
    } catch (err) {
      console.error('Delete failed:', err);
      pushToast('删除失败', '服务器记录未删除，请稍后重试。', 'error');
    }
  };

  const cancelDelete = () => setDeleteTargetId(null);

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
      pushToast('Ping 计划已保存', '新的计划任务配置已生效。', 'success');
    } catch (err) {
      console.error('Failed to save ping config:', err);
      pushToast('保存 Ping 计划失败', '请检查配置后重试。', 'error');
    } finally {
      setIsSavingPingConfig(false);
    }
  };

  const handleRunPingBatch = async () => {
    setIsRunningPingJob(true);
    try {
      const res = await api.post<ServerPingBatchRunResult>('/admin/server-status/run');
      await fetchData();
      pushToast('Ping 批次完成', `${res.data.processedServers}/${res.data.totalServers} 台服务器已处理。`, 'success');
    } catch (err) {
      console.error('Failed to run ping batch:', err);
      pushToast('Ping 批次执行失败', '请稍后重试或检查服务端日志。', 'error');
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
    verifyingIds,
    fetchData,
    handleSelect,
    handleUpload,
    handleSave,
    handleSendEmail,
    handleDelete,
    deleteTargetId,
    confirmDelete,
    cancelDelete,
    handleToggleVerify,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    toasts,
    dismissToast,
  };
}

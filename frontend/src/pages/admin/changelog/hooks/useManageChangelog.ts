import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { api, getUploadUrl } from '../../../../api/client';
import { useAdminFeedback } from '../../components/AdminFeedback';
import { createInitialForm, emptyChange, platformLabels } from '../constants';
import type {
  ChangeDraft,
  PackageAsset,
  PlatformAsset,
  PlatformKey,
  PublishForm,
  ReleaseLog,
  UploadProgressState,
} from '../types';
import { getErrorMessage, isCanceledUpload, parseSigFromText } from '../utils';

export function useManageChangelog() {
  const { confirm, notify, requestInput } = useAdminFeedback();
  const [logs, setLogs] = useState<ReleaseLog[]>([]);
  const [packageAssets, setPackageAssets] = useState<PackageAsset[]>([]);
  const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false);
  const [isManualUploading, setIsManualUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPackage, setIsUploadingPackage] = useState<Record<PlatformKey, boolean>>({
    darwin: false,
    windows: false,
    linux: false,
  });
  const [isUploadingSig, setIsUploadingSig] = useState<Record<PlatformKey, boolean>>({
    darwin: false,
    windows: false,
    linux: false,
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [isPushing, setIsPushing] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<PublishForm>(() => createInitialForm());
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const firstTargetUuid = useMemo(() => {
    if (formData.rolloutType !== 'targeted') return '';
    const list = formData.rolloutValue
      .split(/[,\s]+/)
      .map(item => item.trim())
      .filter(Boolean);
    return list[0] ?? '';
  }, [formData.rolloutType, formData.rolloutValue]);

  const fetchLogs = async () => {
    const response = await api.get<ReleaseLog[]>('/admin/changelog');
    setLogs(response.data);
  };

  const fetchPackageAssets = async () => {
    const response = await api.get<PackageAsset[]>('/admin/package-assets');
    setPackageAssets(response.data);
  };

  useEffect(() => {
    void fetchLogs();
    void fetchPackageAssets();
  }, []);

  useEffect(() => {
    return () => uploadAbortControllerRef.current?.abort();
  }, []);

  const refreshData = () => {
    void fetchLogs();
    void fetchPackageAssets();
  };

  const updatePlatformField = (platform: PlatformKey, field: keyof PlatformAsset, value: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: {
          ...prev.platforms[platform],
          [field]: value,
        },
      },
    }));
  };

  const uploadPackageAsset = async (file: File, title: string) => {
    const body = new FormData();
    body.append('file', file);
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;

    setUploadProgress({
      title,
      fileName: file.name,
      loaded: 0,
      total: file.size,
      percent: 0,
    });

    try {
      const response = await api.post<PackageAsset>('/admin/package-assets/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
        timeout: 900000,
        onUploadProgress: event => {
          const total = event.total ?? file.size;
          const loaded = event.loaded;
          const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
          setUploadProgress({
            title,
            fileName: file.name,
            loaded,
            total,
            percent,
          });
        },
      });

      return response.data;
    } finally {
      if (uploadAbortControllerRef.current === controller) {
        uploadAbortControllerRef.current = null;
      }
    }
  };

  const cancelPackageUpload = () => {
    uploadAbortControllerRef.current?.abort();
  };

  const handlePackageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    platform: PlatformKey,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsUploadingPackage(prev => ({ ...prev, [platform]: true }));

    try {
      const asset = await uploadPackageAsset(file, `上传 ${platformLabels[platform]} 安装包`);
      updatePlatformField(platform, 'url', asset.downloadUrl || getUploadUrl(asset.url));
      await fetchPackageAssets();
    } catch (error) {
      if (!isCanceledUpload(error)) {
        notify('安装包上传失败', getErrorMessage(error, '请重试。'), 'error');
      }
    } finally {
      setIsUploadingPackage(prev => ({ ...prev, [platform]: false }));
      setUploadProgress(null);
    }
  };

  const handleManualPackageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsManualUploading(true);

    try {
      await uploadPackageAsset(file, '手动上传安装包');
      await fetchPackageAssets();
      setIsPackageManagerOpen(true);
    } catch (error) {
      if (!isCanceledUpload(error)) {
        notify('安装包上传失败', getErrorMessage(error, '请重试。'), 'error');
      }
    } finally {
      setIsManualUploading(false);
      setUploadProgress(null);
    }
  };

  const copyDownloadLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify('下载链接已复制', undefined, 'success');
    } catch {
      await requestInput({
        title: '复制下载链接',
        description: '浏览器不允许自动写入剪贴板，请手动复制下面的链接。',
        initialValue: url,
        inputLabel: '下载链接',
        confirmLabel: '关闭',
      });
    }
  };

  const renamePackageAsset = async (asset: PackageAsset) => {
    const nextName = await requestInput({
      title: '重命名安装包',
      description: '请输入新的安装包文件名。',
      initialValue: asset.fileName,
      inputLabel: '文件名',
      confirmLabel: '保存',
    });
    if (!nextName || nextName.trim() === asset.fileName) return;

    try {
      await api.put(
        `/admin/package-assets/${encodeURIComponent(asset.date)}/${encodeURIComponent(asset.fileName)}`,
        { fileName: nextName.trim() },
      );
      await fetchPackageAssets();
    } catch (error) {
      notify('重命名失败', getErrorMessage(error, '请稍后重试。'), 'error');
    }
  };

  const deletePackageAsset = async (asset: PackageAsset) => {
    const confirmed = await confirm({
      title: '删除安装包',
      description: `确认删除安装包 ${asset.fileName} 吗？`,
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(
        `/admin/package-assets/${encodeURIComponent(asset.date)}/${encodeURIComponent(asset.fileName)}`,
      );
      await fetchPackageAssets();
    } catch (error) {
      notify('删除失败', getErrorMessage(error, '请稍后重试。'), 'error');
    }
  };

  const handleSignatureUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    platform: PlatformKey,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setIsUploadingSig(prev => ({ ...prev, [platform]: true }));
    try {
      const content = await file.text();
      const parsed = parseSigFromText(content);
      if (!parsed) {
        notify('.sig 文件解析为空', '请检查文件内容。', 'error');
        return;
      }
      updatePlatformField(platform, 'signature', parsed);
    } catch {
      notify('读取 .sig 文件失败', '请重试。', 'error');
    } finally {
      setIsUploadingSig(prev => ({ ...prev, [platform]: false }));
    }
  };

  const addChange = () => {
    setFormData(prev => ({
      ...prev,
      changes: [...prev.changes, { ...emptyChange }],
    }));
  };

  const updateChange = (index: number, field: keyof ChangeDraft, value: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const applyPreset = (index: number, svg: string, color: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, iconSvg: svg, iconColor: color } : item,
      ),
    }));
  };

  const removeChange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/changelog', formData);
      await fetchLogs();
      setFormData(createInitialForm());
      notify('版本发布成功', '新的版本记录已创建。', 'success');
    } catch (error) {
      notify('发布失败', getErrorMessage(error, '请检查输入后重试。'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollback = async (id: string) => {
    const confirmed = await confirm({
      title: '回滚版本',
      description: '确认回滚该版本吗？',
      confirmLabel: '回滚',
      tone: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.post(`/admin/changelog/${id}/rollback`);
      await fetchLogs();
    } catch (error) {
      notify('回滚失败', getErrorMessage(error, '请稍后重试。'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除版本记录',
      description: '确认删除该版本记录吗？此操作不可撤销。',
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/admin/changelog/${id}`);
      await fetchLogs();
    } catch (error) {
      notify('删除失败', getErrorMessage(error, '请稍后重试。'), 'error');
    }
  };

  const handlePushDownload = async (releaseId: string, platform: 'windows' | 'linux') => {
    const key = `${releaseId}-${platform}`;
    setIsPushing(prev => ({ ...prev, [key]: true }));
    try {
      const response = await api.post<{
        platform: string;
        url: string;
        displayVersion: string;
      }>(`/admin/changelog/${releaseId}/push-hero-download`, { platform });
      notify(
        '首页下载按钮已更新',
        `已将 ${response.data.displayVersion} 的 ${platformLabels[platform]} 下载地址推送到首页按钮。`,
        'success',
      );
    } catch (error) {
      notify('推送失败', getErrorMessage(error, '推送到首页下载按钮失败。'), 'error');
    } finally {
      setIsPushing(prev => ({ ...prev, [key]: false }));
    }
  };

  return {
    logs,
    packageAssets,
    isPackageManagerOpen,
    setIsPackageManagerOpen,
    isManualUploading,
    isSubmitting,
    isUploadingPackage,
    isUploadingSig,
    uploadProgress,
    isPushing,
    formData,
    setFormData,
    firstTargetUuid,
    fetchLogs,
    fetchPackageAssets,
    refreshData,
    updatePlatformField,
    cancelPackageUpload,
    handlePackageUpload,
    handleManualPackageUpload,
    copyDownloadLink,
    renamePackageAsset,
    deletePackageAsset,
    handleSignatureUpload,
    addChange,
    updateChange,
    applyPreset,
    removeChange,
    handleSubmit,
    handleRollback,
    handleDelete,
    handlePushDownload,
  };
}

import { useEffect, useState } from 'react';

import { api } from '../../../api/client';
import { useAdminFeedback } from '../components/AdminFeedback';
import type {
  Feature,
  FeatureFormData,
  FeatureScreenshot,
  FeatureScreenshotFormData,
} from '../types/features';

const initialFeatureFormData: FeatureFormData = {
  id: '',
  iconSvg: '',
  iconColor: '#3b82f6',
  title: '',
  desc: '',
  priority: 1,
};

const initialScreenshotFormData: FeatureScreenshotFormData = {
  imageUrl: '',
  title: '',
  caption: '',
  priority: 1,
};

export function useManageFeatures() {
  const { confirm, notify } = useAdminFeedback();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [screenshots, setScreenshots] = useState<FeatureScreenshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScreenshotSubmitting, setIsScreenshotSubmitting] = useState(false);
  const [uploadingScreenshotId, setUploadingScreenshotId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FeatureFormData>(initialFeatureFormData);
  const [screenshotFormData, setScreenshotFormData] =
    useState<FeatureScreenshotFormData>(initialScreenshotFormData);

  const fetchData = async () => {
    try {
      const [featuresRes, screenshotsRes] = await Promise.all([
        api.get<Feature[]>('/admin/features/all'),
        api.get<FeatureScreenshot[]>('/admin/features/screenshots'),
      ]);
      setFeatures(featuresRes.data);
      setScreenshots(screenshotsRes.data);
    } catch (err) {
      console.error(err);
      notify('特性数据读取失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleChange = (field: keyof FeatureFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScreenshotFormChange = (
    field: keyof FeatureScreenshotFormData,
    value: string | number,
  ) => {
    setScreenshotFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/features', { ...formData, enabled: true });
      setFormData(initialFeatureFormData);
      await fetchData();
      notify('特性已添加', '新的核心特性已保存。', 'success');
    } catch (err) {
      console.error(err);
      notify('特性添加失败', '请检查 ID 是否重复。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.put(`/admin/features/${id}/toggle`);
      await fetchData();
    } catch (err) {
      console.error(err);
      notify('特性状态切换失败', '请稍后重试。', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除核心特性',
      description: '确定要彻底删除该特性吗？此操作不可逆。',
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/features/${id}`);
      await fetchData();
      notify('特性已删除', '该特性已从前台展示配置中移除。', 'success');
    } catch (err) {
      console.error(err);
      notify('特性删除失败', '请稍后重试。', 'error');
    }
  };

  const uploadScreenshotAsset = async (file: File) => {
    const payload = new FormData();
    payload.append('file', file);
    const response = await api.post<{ url: string }>('/admin/upload', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  };

  const handleScreenshotUpload = async (file: File, id?: string) => {
    setUploadingScreenshotId(id ?? 'new');
    try {
      const imageUrl = await uploadScreenshotAsset(file);
      if (id) {
        setScreenshots(prev =>
          prev.map(item => (item.id === id ? { ...item, imageUrl } : item)),
        );
      } else {
        setScreenshotFormData(prev => ({ ...prev, imageUrl }));
      }
      notify('截图已上传', '请保存截图配置使改动生效。', 'success');
    } catch (err) {
      console.error(err);
      notify('截图上传失败', '请重新选择图片后再试。', 'error');
    } finally {
      setUploadingScreenshotId(null);
    }
  };

  const handleScreenshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScreenshotSubmitting(true);
    try {
      await api.post('/admin/features/screenshots', screenshotFormData);
      setScreenshotFormData({ ...initialScreenshotFormData, priority: screenshots.length + 2 });
      await fetchData();
      notify('截图已添加', '前台截图轮播已更新。', 'success');
    } catch (err) {
      console.error(err);
      notify('截图添加失败', '请检查图片地址。', 'error');
    } finally {
      setIsScreenshotSubmitting(false);
    }
  };

  const updateScreenshotDraft = (
    id: string,
    field: keyof FeatureScreenshotFormData,
    value: string | number,
  ) => {
    setScreenshots(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleScreenshotSave = async (item: FeatureScreenshot) => {
    try {
      await api.put(`/admin/features/screenshots/${item.id}`, {
        imageUrl: item.imageUrl,
        title: item.title,
        caption: item.caption,
        priority: Number(item.priority),
      });
      await fetchData();
      notify('截图已保存', '排序和内容已更新。', 'success');
    } catch (err) {
      console.error(err);
      notify('截图保存失败', '请稍后重试。', 'error');
    }
  };

  const handleScreenshotDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除截图',
      description: '确定要删除这张截图吗？前台轮播会立即移除它。',
      confirmLabel: '删除',
      tone: 'error',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/admin/features/screenshots/${id}`);
      await fetchData();
      notify('截图已删除', '前台轮播已移除该截图。', 'success');
    } catch (err) {
      console.error(err);
      notify('截图删除失败', '请稍后重试。', 'error');
    }
  };

  return {
    features,
    screenshots,
    isLoading,
    isSubmitting,
    isScreenshotSubmitting,
    uploadingScreenshotId,
    formData,
    screenshotFormData,
    handleChange,
    handleScreenshotFormChange,
    handleSubmit,
    handleToggle,
    handleDelete,
    handleScreenshotUpload,
    handleScreenshotSubmit,
    updateScreenshotDraft,
    handleScreenshotSave,
    handleScreenshotDelete,
  };
}

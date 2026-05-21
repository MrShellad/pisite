import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, getUploadUrl } from '@/api/client';
import { isLikelyMcVersion, normalizeMcVersionId } from '@/lib/minecraft';
import { isLikelyEmail, normalizeEmail } from '@/lib/validation';
import type {
  CreateServerSubmissionRequest,
  SendSubmissionEmailCodeResponse,
  ServerSubmission,
  VerifySubmissionEmailCodeResponse,
} from '@/types';
import { initialFormState, type ServerSubmissionFormState } from './types';

export interface ServerTagDict {
  id: string;
  category: string;
  label: string;
  iconSvg: string;
  color: string;
}

type AssetField = 'icon' | 'hero';

interface PendingAsset {
  file: File | null;
  fileName: string;
  previewUrl: string;
}

interface PendingAssetsState {
  icon: PendingAsset;
  hero: PendingAsset;
}

interface OwnerUpdateServerSubmissionRequest extends ServerSubmissionFormState {
  contactEmail: string;
  code: string;
}

const EMPTY_PENDING_ASSET: PendingAsset = {
  file: null,
  fileName: '',
  previewUrl: '',
};

const EMPTY_PENDING_ASSETS: PendingAssetsState = {
  icon: EMPTY_PENDING_ASSET,
  hero: EMPTY_PENDING_ASSET,
};
const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024;

function isWebpFile(file: File) {
  return file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
}

function revokeIfBlob(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

async function uploadAsset(file: File) {
  const payload = new FormData();
  payload.append('file', file);

  const response = await api.post<{ url: string }>('/server-submissions/upload-cover', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return getUploadUrl(response.data.url);
}

function toFormState(item: ServerSubmission): ServerSubmissionFormState {
  return {
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
  };
}

function extractBackendMessage(error: unknown) {
  return typeof (error as { response?: { data?: string } })?.response?.data === 'string'
    ? (error as { response?: { data?: string } }).response?.data
    : null;
}

export function useServerSubmission() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ServerSubmissionFormState>(initialFormState);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [pendingAssets, setPendingAssets] = useState<PendingAssetsState>(EMPTY_PENDING_ASSETS);
  const [isUploading, setIsUploading] = useState<AssetField | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [ownerSubmissionId, setOwnerSubmissionId] = useState<string | null>(null);
  const [isOwnerLoading, setIsOwnerLoading] = useState(false);
  const [isOwnerOfflining, setIsOwnerOfflining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagDict, setTagDict] = useState<ServerTagDict[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  const isOwnerMode = Boolean(ownerSubmissionId);

  useEffect(() => {
    api.get('/server-tags-dict')
      .then((res) => setTagDict(res.data))
      .catch((err) => console.error('获取标签字典失败', err));
  }, []);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => revokeIfBlob(url));
    };
  }, []);

  useEffect(() => {
    const normalizedEmail = normalizeEmail(formData.contactEmail);
    if (verifiedEmail && normalizedEmail !== verifiedEmail) {
      setVerificationCode('');
      setVerificationId(null);
      setVerificationToken(null);
      setVerifiedEmail('');
      setVerifiedAt(null);
      setMessage(null);
    }
  }, [formData.contactEmail, verifiedEmail]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, field: AssetField) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!isWebpFile(file)) {
      setError('图片必须使用 WebP 格式。');
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError('WebP 图片大小不能超过 1MB。');
      return;
    }

    setError(null);

    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.push(previewUrl);

    setPendingAssets((current) => {
      revokeIfBlob(current[field].previewUrl);
      return {
        ...current,
        [field]: {
          file,
          fileName: file.name,
          previewUrl,
        },
      };
    });

    setFormData((current) => ({ ...current, [field]: previewUrl }));
  };

  const handleSendVerificationCode = async () => {
    const normalizedEmail = normalizeEmail(formData.contactEmail);

    if (!normalizedEmail) {
      setError('请先填写联系邮箱。');
      return;
    }

    if (!isLikelyEmail(normalizedEmail)) {
      setError('联系邮箱格式不正确。');
      return;
    }

    setIsSendingCode(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.post<SendSubmissionEmailCodeResponse>(
        '/server-submissions/email/send-code',
        { email: normalizedEmail },
      );
      setVerificationId(response.data.verificationId);
      setVerificationCode('');
      setVerificationToken(null);
      setVerifiedEmail('');
      setVerifiedAt(null);
      setMessage(`验证码已发送，请在 ${Math.ceil(response.data.expiresInSeconds / 60)} 分钟内完成验证。`);
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '验证码发送失败，请稍后重试。');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedEmail = normalizeEmail(formData.contactEmail);

    if (!verificationId) {
      setError('请先发送验证码。');
      return;
    }

    if (!verificationCode.trim()) {
      setError('请输入邮箱验证码。');
      return;
    }

    setIsVerifyingCode(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.post<VerifySubmissionEmailCodeResponse>(
        '/server-submissions/email/verify-code',
        {
          email: normalizedEmail,
          verificationId,
          code: verificationCode.trim(),
        },
      );
      setVerificationToken(response.data.verificationToken);
      setVerifiedEmail(normalizedEmail);
      setVerifiedAt(response.data.verifiedAt);
      setMessage('邮箱验证通过，现在可以提交服务器资料。');
    } catch (requestError) {
      const backendMessage =
        typeof (requestError as { response?: { data?: string } })?.response?.data === 'string'
          ? (requestError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '验证码校验失败，请确认后重试。');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const validateCoreFields = () => {
    const normalizedEmail = normalizeEmail(formData.contactEmail);

    if (!formData.name.trim() || !formData.ip.trim()) {
      return '请先填写服务器名称和连接地址。';
    }

    if (!pendingAssets.icon.file && !formData.icon.trim()) {
      return '请先选择 Hero Logo。';
    }

    if (!pendingAssets.hero.file && !formData.hero.trim()) {
      return '请先选择 Hero 封面。';
    }

    if (formData.versions.length === 0) {
      return '请至少填写一个 Minecraft 版本。';
    }

    const invalidVersion = formData.versions.find((version) => !isLikelyMcVersion(version));
    if (invalidVersion) {
      return `MC 版本格式不正确：${invalidVersion}`;
    }

    if (formData.serverType === 'modded' && !formData.modpackUrl.trim()) {
      return '模组服需要填写整合包下载地址。';
    }

    if (formData.hasVoiceChat && !formData.voiceUrl.trim()) {
      return '开启语音后，需要填写语音频道地址。';
    }

    if (!normalizedEmail) {
      return '请填写联系邮箱。';
    }

    if (!isLikelyEmail(normalizedEmail)) {
      return '联系邮箱格式不正确。';
    }

    return null;
  };

  const validateBeforeSubmit = () => {
    const normalizedEmail = normalizeEmail(formData.contactEmail);
    const validationError = validateCoreFields();
    if (validationError) {
      return validationError;
    }

    if (!verificationToken || verifiedEmail !== normalizedEmail) {
      return '请先完成邮箱验证码验证。';
    }

    return null;
  };

  const buildSanitizedFormPayload = (): ServerSubmissionFormState => ({
    ...formData,
    name: formData.name.trim(),
    ip: formData.ip.trim(),
    website: formData.website.trim(),
    modpackUrl: formData.serverType === 'modded' ? formData.modpackUrl.trim() : '',
    voiceUrl: formData.hasVoiceChat ? formData.voiceUrl.trim() : '',
    contactEmail: normalizeEmail(formData.contactEmail),
    versions: Array.from(
      new Set(
        formData.versions
          .map((version) => normalizeMcVersionId(version))
          .filter(Boolean),
      ),
    ),
    socialLinks: formData.socialLinks.filter((item) => item.platform.trim() && item.url.trim()),
  });

  const uploadPendingAssetsIntoPayload = async <T extends ServerSubmissionFormState>(payload: T) => {
    if (pendingAssets.icon.file) {
      setIsUploading('icon');
      payload.icon = await uploadAsset(pendingAssets.icon.file);
    }

    if (pendingAssets.hero.file) {
      setIsUploading('hero');
      payload.hero = await uploadAsset(pendingAssets.hero.file);
    }

    setIsUploading(null);
    return payload;
  };

  const resetPendingAssets = () => {
    setPendingAssets((current) => {
      revokeIfBlob(current.icon.previewUrl);
      revokeIfBlob(current.hero.previewUrl);
      return EMPTY_PENDING_ASSETS;
    });
  };

  const handleLoadOwnerSubmission = async () => {
    const normalizedEmail = normalizeEmail(ownerEmail);
    const code = ownerCode.trim();

    if (!normalizedEmail || !isLikelyEmail(normalizedEmail)) {
      setError('请输入原始联系邮箱。');
      return;
    }

    if (!code) {
      setError('请输入审核通过邮件中的管理 Code。');
      return;
    }

    setIsOwnerLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.post<ServerSubmission>('/server-submissions/owner/lookup', {
        contactEmail: normalizedEmail,
        code,
      });
      resetPendingAssets();
      setFormData(toFormState(response.data));
      setOwnerEmail(normalizedEmail);
      setOwnerSubmissionId(response.data.id);
      setVerificationCode('');
      setVerificationId(null);
      setVerificationToken(null);
      setVerifiedEmail('');
      setVerifiedAt(null);
      setMessage('已载入服务器资料，可以修改信息或下线服务器。');
    } catch (loadError) {
      setError(extractBackendMessage(loadError) || '载入失败，请确认邮箱和管理 Code 是否正确。');
    } finally {
      setIsOwnerLoading(false);
    }
  };

  const handleResetOwnerMode = () => {
    resetPendingAssets();
    setOwnerSubmissionId(null);
    setOwnerEmail('');
    setOwnerCode('');
    setFormData(initialFormState);
    setError(null);
    setMessage(null);
  };

  const handleOwnerOffline = async () => {
    const normalizedEmail = normalizeEmail(ownerEmail || formData.contactEmail);
    const code = ownerCode.trim();
    if (!ownerSubmissionId || !normalizedEmail || !code) return;
    if (!window.confirm('确定要下线这台服务器吗？下线后前台将不再展示。')) return;

    setIsOwnerOfflining(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/server-submissions/owner/offline', {
        contactEmail: normalizedEmail,
        code,
      });
      handleResetOwnerMode();
      setMessage('服务器已下线。');
    } catch (offlineError) {
      setError(extractBackendMessage(offlineError) || '下线失败，请稍后重试。');
    } finally {
      setIsOwnerOfflining(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = isOwnerMode ? validateCoreFields() : validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isOwnerMode) {
        const ownerValidationError = validateCoreFields();
        if (ownerValidationError) {
          setError(ownerValidationError);
          return;
        }

        const ownerPayload: OwnerUpdateServerSubmissionRequest = {
          ...(await uploadPendingAssetsIntoPayload(buildSanitizedFormPayload())),
          contactEmail: normalizeEmail(ownerEmail || formData.contactEmail),
          code: ownerCode.trim(),
        };
        await api.put('/server-submissions/owner/update', ownerPayload);
        resetPendingAssets();
        setFormData(ownerPayload);
        setMessage('服务器资料已保存。');
        return;
      }

      const payload: CreateServerSubmissionRequest = {
        ...(await uploadPendingAssetsIntoPayload(buildSanitizedFormPayload())),
        emailVerificationToken: verificationToken!,
      };

      await api.post('/server-submissions', payload);
      setFormData(payload);
      navigate('/servers/submit/success', { state: { serverData: payload } });
    } catch (submitError) {
      setError(extractBackendMessage(submitError) || '提交失败，请检查字段后重试。');
    } finally {
      setIsUploading(null);
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    verificationCode,
    setVerificationCode,
    verificationId,
    verificationToken,
    verifiedEmail,
    verifiedAt,
    ownerEmail,
    setOwnerEmail,
    ownerCode,
    setOwnerCode,
    isOwnerMode,
    isOwnerLoading,
    isOwnerOfflining,
    pendingAssets,
    isUploading,
    isSendingCode,
    isVerifyingCode,
    isSubmitting,
    message,
    tagDict,
    error,
    handleUpload,
    handleSendVerificationCode,
    handleVerifyCode,
    handleLoadOwnerSubmission,
    handleResetOwnerMode,
    handleOwnerOffline,
    handleSubmit,
  };
}

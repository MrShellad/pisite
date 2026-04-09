import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, getUploadUrl } from '@/api/client';
import { isLikelyMcVersion, normalizeMcVersionId } from '@/lib/minecraft';
import { isLikelyEmail, normalizeEmail } from '@/lib/validation';
import type {
  CreateServerSubmissionRequest,
  SendSubmissionEmailCodeResponse,
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

const EMPTY_PENDING_ASSET: PendingAsset = {
  file: null,
  fileName: '',
  previewUrl: '',
};

const EMPTY_PENDING_ASSETS: PendingAssetsState = {
  icon: EMPTY_PENDING_ASSET,
  hero: EMPTY_PENDING_ASSET,
};

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.width, height: image.height });
      image.onerror = () => reject(new Error('failed to read image dimensions'));
      image.src = objectUrl;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagDict, setTagDict] = useState<ServerTagDict[]>([]);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    api.get('/server-tags-dict')
      .then((res) => setTagDict(res.data))
      .catch((err) => console.error('获取标签字典失败', err));
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => revokeIfBlob(url));
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

    if (file.size > 1024 * 1024) {
      setError('图片大小不能超过 1MB。');
      return;
    }

    if (field === 'icon') {
      try {
        const { width, height } = await readImageDimensions(file);
        if (width > 512 || height > 512) {
          setError('Icon 建议不超过 512x512。');
          return;
        }
      } catch {
        setError('无法读取图片尺寸，请重新选择文件。');
        return;
      }
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

  const validateBeforeSubmit = () => {
    const normalizedEmail = normalizeEmail(formData.contactEmail);

    if (!formData.name.trim() || !formData.ip.trim()) {
      return '请先填写服务器名称和连接地址。';
    }

    if (!pendingAssets.icon.file && !formData.icon.trim()) {
      return '请先选择服务器 Icon。';
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

    if (!verificationToken || verifiedEmail !== normalizedEmail) {
      return '请先完成邮箱验证码验证。';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateServerSubmissionRequest = {
        ...formData,
        name: formData.name.trim(),
        ip: formData.ip.trim(),
        website: formData.website.trim(),
        modpackUrl: formData.serverType === 'modded' ? formData.modpackUrl.trim() : '',
        voiceUrl: formData.hasVoiceChat ? formData.voiceUrl.trim() : '',
        contactEmail: normalizeEmail(formData.contactEmail),
        emailVerificationToken: verificationToken!,
        versions: Array.from(
          new Set(
            formData.versions
              .map((version) => normalizeMcVersionId(version))
              .filter(Boolean),
          ),
        ),
        socialLinks: formData.socialLinks.filter(
          (item) => item.platform.trim() && item.url.trim(),
        ),
      };

      if (pendingAssets.icon.file) {
        setIsUploading('icon');
        payload.icon = await uploadAsset(pendingAssets.icon.file);
      }

      if (pendingAssets.hero.file) {
        setIsUploading('hero');
        payload.hero = await uploadAsset(pendingAssets.hero.file);
      }

      setIsUploading(null);
      await api.post('/server-submissions', payload);
      setFormData(payload);
      navigate('/servers/submit/success', { state: { serverData: payload } });
    } catch (submitError) {
      const backendMessage =
        typeof (submitError as { response?: { data?: string } })?.response?.data === 'string'
          ? (submitError as { response?: { data?: string } }).response?.data
          : null;

      setError(backendMessage || '提交失败，请检查字段后重试。');
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
    handleSubmit,
  };
}

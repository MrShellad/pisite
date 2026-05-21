export function parseSigFromText(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed) as { signature?: string; sig?: string } | string;
    if (typeof parsed === 'string') return parsed.trim();
    if (typeof parsed.signature === 'string' && parsed.signature.trim()) {
      return parsed.signature.trim();
    }
    if (typeof parsed.sig === 'string' && parsed.sig.trim()) {
      return parsed.sig.trim();
    }
  } catch {
    // Not JSON, keep parsing by line below.
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('untrusted comment:') && !line.startsWith('trusted comment:'));

  const likelySig = lines.find(line => /^[A-Za-z0-9+/=_-]{40,}$/.test(line));
  if (likelySig) return likelySig;

  return lines[0] ?? trimmed;
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${sizeBytes} B`;
}

export function getErrorMessage(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) return responseData;

  const candidate = error as { code?: string; message?: string };
  if (candidate.code === 'ECONNABORTED') {
    return '上传请求超时。请检查反向代理/网关的上传大小和超时配置。';
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return fallback;
}

export function isCanceledUpload(error: unknown) {
  const candidate = error as { code?: string; name?: string };
  return candidate.code === 'ERR_CANCELED' || candidate.name === 'CanceledError';
}

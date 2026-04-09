const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isLikelyEmail(value: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

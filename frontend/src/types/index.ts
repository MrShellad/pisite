export interface Sponsor {
  id: string;
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  price: string;
  link: string;
  regions: string[];
  priority: number;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  enabled: boolean;
}

export interface FriendLink {
  name: string;
  href: string;
}

export interface ChangeItem {
  type: 'feature' | 'fix';
  text: string;
}

export interface ChangelogEntry {
  vversion: string;
  date: string;
  isLatest: boolean;
  changes: ChangeItem[];
}

// ==========================================
// 以下为全新重构的服务器发现页模型
// ==========================================
export interface SocialLink {
  platform: string;
  url: string;
}
// 1. 新增：通用的图文标签模型
export interface IconTag {
  label: string;
  iconSvg: string;
  color: string;
}

// 2. 数据库返回的完整服务器实体模型 (对应后端的 ServerSubmission)
export interface ServerSubmission {
  id: string;
  name: string;
  description: string;
  ip: string;
  port: number;
  versions: string[];
  maxPlayers: number;
  onlinePlayers: number;
  icon: string;
  hero: string;
  contactEmail: string;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  emailVerificationId?: string | null;
  website: string;
  serverType: string; // 'vanilla' | 'plugin' | 'modded'
  language: string;
  modpackUrl: string;
  hasPaidContent: boolean; 
  ageRecommendation: string;
  socialLinks: SocialLink[];
  hasVoiceChat: boolean;
  voicePlatform: string;
  voiceUrl: string;
  features: IconTag[];
  mechanics: IconTag[];
  elements: IconTag[];
  community: IconTag[];
  tags: string[];
  
  createdAt?: string | null;
  verified: boolean;
  statusOnlinePlayers?: number | null;
  statusMaxPlayers?: number | null;
  statusIsOnline?: boolean | null;
  statusUpdatedAt?: string | null;
  statusExpiresAt?: string | null;
  statusIsExpired?: boolean | null;
}

// 3. 前端提交表单的状态模型 (剔除了由后端生成的 id, createdAt, verified)
export interface ServerSubmissionFormState {
  name: string;
  description: string;
  ip: string;
  port: number;
  versions: string[];
  maxPlayers: number;
  onlinePlayers: number;
  icon: string;
  hero: string;
  contactEmail: string;
  website: string;
  serverType: string;
  language: string;
  modpackUrl: string;
  hasPaidContent: boolean; 
  ageRecommendation: string;
  socialLinks: SocialLink[];
  hasVoiceChat: boolean;
  voicePlatform: string;
  voiceUrl: string;
  features: IconTag[];
  mechanics: IconTag[];
  elements: IconTag[];
  community: IconTag[];
  tags: string[];
}

export interface ServerPingConfig {
  id: string;
  enabled: boolean;
  intervalSeconds: number;
  batchSize: number;
  timeoutMs: number;
  ttlSeconds: number;
  cursor: number;
  lastRunAt?: string | null;
  lastRunStatus?: string | null;
}

export interface ServerPingBatchRunResult {
  totalServers: number;
  processedServers: number;
  cursor: number;
}

export interface CreateServerSubmissionRequest extends ServerSubmissionFormState {
  emailVerificationToken: string;
}

export interface SendSubmissionEmailCodeResponse {
  verificationId: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

export interface VerifySubmissionEmailCodeResponse {
  verificationToken: string;
  verifiedAt: string;
}

export interface SubmissionEmailConfig {
  id: string;
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpFromEmail: string;
  smtpFromName: string;
  smtpReplyTo: string;
  smtpSecurity: 'none' | 'starttls' | 'tls';
  smtpAuth: 'none' | 'plain' | 'login';
  hasPassword: boolean;
  codeTtlMinutes: number;
  resendCooldownSeconds: number;
  maxVerifyAttempts: number;
  updatedAt?: string | null;
}

export interface SubmissionEmailConfigUpdatePayload {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword?: string | null;
  clearSmtpPassword: boolean;
  smtpFromEmail: string;
  smtpFromName: string;
  smtpReplyTo: string;
  smtpSecurity: 'none' | 'starttls' | 'tls';
  smtpAuth: 'none' | 'plain' | 'login';
  codeTtlMinutes: number;
  resendCooldownSeconds: number;
  maxVerifyAttempts: number;
}

export interface SubmissionEmailRule {
  id: string;
  mode: 'whitelist' | 'blacklist';
  patternType: 'domain_suffix' | 'exact_email' | 'contains';
  pattern: string;
  description: string;
  priority: number;
  enabled: boolean;
  createdAt?: string | null;
}

export interface SubmissionEmailRulePayload {
  mode: SubmissionEmailRule['mode'];
  patternType: SubmissionEmailRule['patternType'];
  pattern: string;
  description: string;
  priority: number;
  enabled: boolean;
}

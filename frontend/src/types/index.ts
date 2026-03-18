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

// frontend/src/types/index.ts

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
  type: 'feature' | 'fix'; // 限定只能是这两种字符串，享受 TypeScript 的类型提示
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  isLatest: boolean; // ✅ 修改为 boolean
  changes: ChangeItem[];
}
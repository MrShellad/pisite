// frontend/src/pages/admin/types/hero.ts

export interface HeroFormData {
  id: string;
  logoUrl: string; // 【修改】将 logoSvg 替换为 logoUrl
  logoColor: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  updateDate: string;
  dlMac: string;
  dlWin: string;
  dlLinux: string;
}
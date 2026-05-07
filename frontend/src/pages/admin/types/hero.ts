// frontend/src/pages/admin/types/hero.ts

export interface HeroFormData {
  id: string;
  logoUrl: string; // 默认采用 logoUrl，如果未上传则使用 logoSvg
  logoColor: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  updateDate: string;
  dlMac: string;
  dlWin: string;
  dlLinux: string;
  steamDeckSourceUrl: string;
}

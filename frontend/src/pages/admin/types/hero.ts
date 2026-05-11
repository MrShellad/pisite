// frontend/src/pages/admin/types/hero.ts

export interface HeroFormData {
  id: string;
  logoUrl: string; // 銆愪慨鏀广€戝皢 logoSvg 鏇挎崲涓?logoUrl
  logoColor: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  titleEn: string;
  subtitleEn: string;
  descriptionEn: string;
  buttonTextEn: string;
  updateDate: string;
  dlMac: string;
  dlWin: string;
  dlLinux: string;
  steamDeckSourceUrl: string;
}

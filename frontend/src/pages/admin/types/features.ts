// frontend/src/pages/admin/types/features.ts

export interface Feature {
  id: string;
  iconSvg: string;
  iconColor: string;
  title: string;
  desc: string;
  priority: number;
  enabled: boolean;
}

// 剔除 enabled 字段，用于表单提交状态
export type FeatureFormData = Omit<Feature, 'enabled'>;

export interface FeatureScreenshot {
  id: string;
  imageUrl: string;
  title: string;
  caption: string;
  priority: number;
}

export type FeatureScreenshotFormData = Omit<FeatureScreenshot, 'id'>;

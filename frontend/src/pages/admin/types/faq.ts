// frontend/src/pages/admin/types/faq.ts

export interface Faq {
  id: string;
  question: string;
  answer: string;
  iconSvg: string;
  iconColor: string;
  priority: number;
  enabled: boolean;
}

// 剔除 enabled，作为表单状态
export type FaqFormData = Omit<Faq, 'enabled'>;
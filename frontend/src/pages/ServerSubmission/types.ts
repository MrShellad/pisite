// frontend/src/pages/ServerSubmission/types.ts

// 1. 从全局类型文件中引入类型定义 (这里用到了你刚才配置的 @ 别名)
import type { IconTag, ServerSubmissionFormState } from '@/types/index';

// 2. 将它们重新导出去，这样你当前目录下的组件就不需要修改引入路径了
export type { IconTag, ServerSubmissionFormState };

// 3. 这个文件现在只负责保留页面特定的“业务初始状态”
export const initialFormState: ServerSubmissionFormState = {
  name: '', description: '', ip: '', port: 25565, versions: [], maxPlayers: 100, 
  onlinePlayers: 0, 
  icon: '', hero: '', website: '', serverType: 'vanilla', 
  language: 'zh-CN', 
  modpackUrl: '', 
  hasPaidContent: false, ageRecommendation: '全年龄',
  socialLinks: [],
  hasVoiceChat: false,
  voicePlatform: 'QQ', 
  voiceUrl: '',
  features: [], mechanics: [], elements: [], community: [], tags: [],
};
// frontend/src/components/Footer.tsx
import { useState, useEffect } from 'react';
import { Zap, Github, Twitter, Mail, MessageSquare } from 'lucide-react';
import { styleTokens } from '../lib/design-tokens';
import { api } from '../api/client';

export default function Footer() {
  const [settings, setSettings] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    // 拉取后台配置的全局设置 (SEO、社交平台、版权等)
    api.get('/settings').then(res => setSettings(res.data)).catch(console.error);
    
    // 拉取友情链接数据
    api.get('/friends').then(res => setFriends(res.data)).catch(() => setFriends([]));
  }, []);

  // 如果配置还没加载出来，暂时不渲染底部，避免页面闪烁
  if (!settings) return null;

  return (
    // 使用半透明背景和顶部边框，与页面的渐变流完美融合
    <footer className="mt-20 border-t-2 border-neutral-200/50 dark:border-neutral-800/50 bg-white/30 dark:bg-neutral-950/30 backdrop-blur-md transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-8">
        
        {/* 上半部分：极简左右两栏布局 */}
        <div className="flex flex-col md:flex-row justify-between gap-12 md:gap-8 mb-16">
          
          {/* 左侧：动态品牌信息、SEO 描述与社交矩阵 */}
          <div className="max-w-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white drop-shadow-sm">
                <Zap size={18} strokeWidth={2.5} />
              </div>
              <span className={`text-xl font-black tracking-tight ${styleTokens.textPrimary}`}>
                {settings.siteName}
              </span>
            </div>
            
            {/* 动态读取后台的 SEO Description */}
            <p className={`text-sm leading-relaxed ${styleTokens.textSecondary}`}>
              {settings.seoDescription}
            </p>
            
            {/* 动态社交媒体图标 (有值才渲染) */}
            <div className="flex items-center gap-4 pt-2">
              {settings.githubUrl && (
                <a href={settings.githubUrl} target="_blank" rel="noreferrer" className={`text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full ${styleTokens.focusRing}`} aria-label="GitHub">
                  <Github size={20} />
                </a>
              )}
              {settings.twitterUrl && (
                <a href={settings.twitterUrl} target="_blank" rel="noreferrer" className={`text-neutral-400 hover:text-[#1DA1F2] transition-colors rounded-full ${styleTokens.focusRing}`} aria-label="Twitter">
                  <Twitter size={20} />
                </a>
              )}
              {settings.discordUrl && (
                <a href={settings.discordUrl} target="_blank" rel="noreferrer" className={`text-neutral-400 hover:text-[#5865F2] transition-colors rounded-full ${styleTokens.focusRing}`} aria-label="Discord">
                  <MessageSquare size={20} />
                </a>
              )}
              {settings.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`} className={`text-neutral-400 hover:text-red-500 transition-colors rounded-full ${styleTokens.focusRing}`} aria-label="Email">
                  <Mail size={20} />
                </a>
              )}
            </div>
          </div>

          {/* 右侧：友情链接 */}
          <div className="md:min-w-[150px]">
            <h4 className={`font-semibold mb-4 tracking-wider ${styleTokens.textPrimary}`}>友情链接</h4>
            <ul className="space-y-3">
              {friends.length === 0 ? (
                <li className={`text-sm ${styleTokens.textSecondary}`}>暂无友链</li>
              ) : (
                friends.map((link) => (
                  // 兼容朋友链接的数据结构，假设有 url 和 name 字段
                  <li key={link.id || link.name}>
                    <a href={link.url || link.href} target="_blank" rel="noopener noreferrer" className={`text-sm font-medium ${styleTokens.textSecondary} hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm ${styleTokens.focusRing}`}>
                      {link.name}
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>

        </div>

        {/* 下半部分：动态版权信息与系统状态 */}
        <div className={`pt-8 border-t border-neutral-200/50 dark:border-neutral-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono ${styleTokens.textSecondary}`}>
          <p>{settings.copyright}</p>
          <div className="flex gap-4 items-center">
            <a href="#" className={`hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors rounded-sm ${styleTokens.focusRing}`}>隐私政策</a>
            <a href="#" className={`hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors rounded-sm ${styleTokens.focusRing}`}>服务条款</a>
            <span className="flex items-center gap-2 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Normal
            </span>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
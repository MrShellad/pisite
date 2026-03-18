// frontend/src/pages/ServerSubmission/SuccessPreview.tsx
import { useState } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, ImagePlus, Mic, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import type { ServerSubmissionFormState } from '@/types/index';
import Footer from '@/components/Footer';

export default function ServerSuccessPreview() {
  const location = useLocation();
  // 获取刚刚提交的缓存数据
  const serverData = location.state?.serverData as ServerSubmissionFormState;
  const [isExpanded, setIsExpanded] = useState(false);

  // 如果没有数据（例如用户手动在地址栏输入这个 URL），则踢回提交页
  if (!serverData) {
    return <Navigate to="/servers/submit" replace />;
  }

  const serverTypeName = serverData.serverType === 'vanilla' ? '纯净原版' : serverData.serverType === 'plugin' ? '插件服' : '模组服';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#fff8f1_0%,_#fffdf9_48%,_#f8fafc_100%)] text-neutral-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.32),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.28),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#020617_45%,_#020617_100%)] dark:text-neutral-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        
        <div className="flex justify-center mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-200 dark:hover:border-orange-400/70"
          >
            <ArrowLeft size={16} /> 返回首页
          </Link>
        </div>

        {/* 成功提示徽章 */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-12 animate-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-emerald-500/30">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-neutral-50">提交成功！</h1>
          <p className="text-neutral-600 max-w-lg dark:text-neutral-400">
            你的服务器 <b>{serverData.name}</b> 已成功提交至云端。管理员将在审核后通过，届时你的服务器将在发现页隆重登场。
          </p>
        </div>

        {/* 临时预览卡片 */}
        <div className="bg-white/80 backdrop-blur rounded-[32px] border border-neutral-200/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] overflow-hidden transition-all duration-500 dark:bg-neutral-950/70 dark:border-neutral-800 dark:shadow-[0_40px_140px_rgba(15,23,42,0.9)]">
          
          {/* 上半部分：封面与基础信息 (默认显示) */}
          <div 
            className="relative aspect-[21/9] sm:aspect-[16/6] cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {serverData.hero ? (
              <img
                src={serverData.hero}
                alt="Hero预览"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-900 text-white/50">
                <ImagePlus size={32} />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            
            {serverData.icon && (
              <img
                src={serverData.icon}
                alt="Icon"
                className="absolute top-5 left-5 w-16 h-16 rounded-xl border-2 border-white shadow-lg bg-white object-cover"
              />
            )}

            <div className="absolute bottom-5 left-5 right-5 text-white flex justify-between items-end pointer-events-none">
              <div>
                <div className="text-2xl font-black mb-1">{serverData.name}</div>
                <div className="text-xs text-white/80 flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur">{serverTypeName}</span>
                  <span>{serverData.ip}{serverData.port !== 25565 ? `:${serverData.port}` : ''}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">{serverData.maxPlayers} 槽位</div>
                <div className="text-white/60 text-xs mt-1">
                  {serverData.versions.length > 0 ? serverData.versions.slice(0, 2).join(', ') : '暂无版本'}
                </div>
              </div>
            </div>

            {/* 点击展开提示 */}
            <div className="absolute top-5 right-5 bg-black/40 backdrop-blur text-white/90 text-xs px-3 py-1.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isExpanded ? <><ChevronUp size={14}/> 收起详情</> : <><ChevronDown size={14}/> 展开全貌</>}
            </div>
          </div>

          {/* 下半部分：详情与富文本 (点击后展开) */}
          <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="p-6 md:p-10 border-t border-neutral-100 space-y-8 dark:border-neutral-800">
                
                {/* 徽章区 */}
                <div className="flex flex-wrap gap-2">
                  {serverData.hasPaidContent && (
                    <span className="inline-flex items-center text-xs font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full border border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/40">
                      包含内购/氪金
                    </span>
                  )}
                  <span className="inline-flex items-center text-xs font-bold bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full border border-neutral-200 dark:bg-neutral-900/60 dark:text-neutral-300 dark:border-neutral-800">
                    {serverData.ageRecommendation}
                  </span>
                  {serverData.socialLinks.map((link, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/40"
                    >
                      <LinkIcon size={12} /> {link.platform}
                    </span>
                  ))}
                  {serverData.hasVoiceChat && serverData.voicePlatform && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/40">
                      <Mic size={12} /> {serverData.voicePlatform} 语音
                    </span>
                  )}
                </div>

                {/* 所有图文标签平铺展示 */}
                <div className="flex flex-wrap gap-2">
                  {[...serverData.features, ...serverData.mechanics, ...serverData.elements, ...serverData.community].map((tag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm bg-white dark:bg-neutral-900/80"
                      style={{ borderColor: `${tag.color}40`, color: tag.color }}
                    >
                      <div className="w-4 h-4 flex items-center justify-center shrink-0" dangerouslySetInnerHTML={{ __html: tag.iconSvg }} />
                      <span className="text-xs font-bold whitespace-nowrap">{tag.label}</span>
                    </div>
                  ))}
                </div>

                {/* 富文本区 */}
                <div>
                  <h3 className="text-lg font-bold mb-4 text-neutral-800 border-b border-neutral-100 pb-2 dark:text-neutral-100 dark:border-neutral-800">
                    详细介绍
                  </h3>
                  <div 
                    className="prose prose-sm md:prose-base prose-orange max-w-none prose-img:rounded-xl prose-headings:font-bold prose-a:text-orange-600 break-words dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: serverData.description || '<p class="text-neutral-400">暂无介绍内容。</p>' }}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* 底部点击栏 (仅在收起时明显) */}
          {!isExpanded && (
            <div 
              className="py-3 bg-neutral-50/50 hover:bg-neutral-100 border-t border-neutral-100 flex justify-center cursor-pointer text-neutral-400 hover:text-orange-500 transition-colors dark:bg-neutral-900/70 dark:hover:bg-neutral-800/80 dark:border-neutral-800 dark:text-neutral-500"
              onClick={() => setIsExpanded(true)}
            >
              <ChevronDown size={20} className="animate-bounce" />
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
}
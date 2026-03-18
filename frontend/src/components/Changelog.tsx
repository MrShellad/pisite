// frontend/src/components/Changelog.tsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Changelog({ isFullPage = false }: { isFullPage?: boolean }) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/changelog').then(res => setLogs(res.data)).catch(console.error);
  }, []);

  if (logs.length === 0) return null;

  // 正则解析高亮语法，注入动态颜色
  const renderHighlightedText = (text: string, color: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const innerText = part.slice(2, -2);
        return (
          <span 
            key={i} 
            className="font-bold px-1.5 py-0.5 rounded text-xs mx-1 inline-block"
            style={{ color: color, backgroundColor: `${color}26` }} 
          >
            {innerText}
          </span>
        );
      }
      return <span key={i} className="leading-loose">{part}</span>;
    });
  };

  const displayLogs = isFullPage ? logs : logs.slice(0, 3);

  return (
    <section id="changelog" className={`${isFullPage ? 'pt-32 pb-20' : 'py-20'} relative z-10`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* 头部标题 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold dark:text-white">
            {isFullPage ? '完整更新日志' : '产品更新动态'}
          </h2>
          {isFullPage && <p className="text-neutral-500 mt-4">记录我们每一次的进步与重构</p>}
        </div>
        
        {/* 时间轴主容器 */}
        <div className="relative border-l-2 border-blue-200/60 dark:border-blue-800/60 ml-4 md:ml-6 pb-4">
          
          {displayLogs.map((entry) => (
            <motion.div 
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative pl-8 md:pl-12 mb-12" // mb-12 替代之前的 space-y，控制每个日志块的间距
            >
              {/* 【全新排版】时间轴节点 与 日期文本在同一行 */}
              <div className="flex items-center mb-4 relative">
                {/* 定位在竖线上的圆点 */}
                <div 
                  className={`absolute -left-[41px] md:-left-[57px] w-4 h-4 rounded-full border-4 border-white dark:border-neutral-950
                  ${entry.isLatest 
                    ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse' 
                    : 'bg-blue-300 dark:bg-blue-700'
                  }`}
                ></div>
                
                {/* 靠在时间轴旁边的日期 */}
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wide">
                  {entry.date}
                </span>
              </div>

              {/* 【彻底去除了浮动与阴影】纯平科技蓝磨砂卡片主体 */}
              <div className={`
                relative p-8 rounded-[2rem] overflow-hidden 
                bg-gradient-to-br from-blue-50/90 to-blue-100/30 dark:from-blue-900/20 dark:to-neutral-900/50
                backdrop-blur-2xl border-2 border-blue-200/60 dark:border-blue-800/50
              `}>
                
                {/* 卡片内部的高光氛围渲染保留，维持科技感 (仅限最新版) */}
                {entry.isLatest && (
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                )}

                {/* 卡片头部：仅保留版本号与 Latest 标签 */}
                <div className="flex items-center gap-4 mb-8 border-b-2 border-blue-100/50 dark:border-blue-800/50 pb-6 relative z-10">
                  <h3 className="text-2xl font-black tracking-tight text-blue-950 dark:text-blue-50">
                    {entry.version}
                  </h3>
                  {entry.isLatest && (
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] uppercase font-bold rounded-full">
                      Latest
                    </span>
                  )}
                </div>

                {/* 卡片内容：更新详情列表 */}
                <div className="space-y-6 relative z-10">
                  {entry.changes.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start group">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                        style={{ backgroundColor: `${item.iconColor}1A`, color: item.iconColor }}
                      >
                        <div className="w-5 h-5 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: item.iconSvg }} />
                      </div>
                      <div className="flex-1 text-neutral-700 dark:text-neutral-300 text-sm leading-loose pt-1">
                        {renderHighlightedText(item.text, item.iconColor)}
                      </div>
                    </div>
                  ))}
                </div>
                
              </div>
            </motion.div>
          ))}
        </div>

        {/* 仅在首页展示底部跳转按钮，去掉了阴影与浮动效果 */}
        {!isFullPage && logs.length > 3 && (
          <div className="mt-8 text-center relative z-10">
            <Link 
              to="/changelog" 
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white/50 dark:bg-blue-900/20 backdrop-blur-md border-2 border-blue-200 dark:border-blue-800 font-bold text-blue-700 dark:text-blue-400 hover:text-white hover:border-blue-500 hover:bg-blue-600 dark:hover:bg-blue-600 transition-colors duration-300"
            >
              查看完整更新日志 &rarr;
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}

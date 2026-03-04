// frontend/src/components/Hero.tsx
import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { staggerContainer, heroFadeDown, logoEntry, buttonShineSweep, styleTokens } from '../lib/design-tokens';

export default function Hero() {
  const [config, setConfig] = useState<any>(null);
  
  // 用于存储当前用户的平台信息
  const [osInfo, setOsInfo] = useState({ name: 'Windows', svg: '', url: '#' });

// 【新增】处理下载与打点打点逻辑
  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // 暂时阻止默认跳转

    // 1. 获取或生成浏览器轻量级指纹 (存活于 LocalStorage)
    let fingerprint = localStorage.getItem('flowcore_browser_id');
    if (!fingerprint) {
      // 现代浏览器自带的极速 UUID 生成器
      fingerprint = crypto.randomUUID(); 
      localStorage.setItem('flowcore_browser_id', fingerprint);
    }

    // 2. 异步发送打点数据给后端 (不 await 阻塞，直接发出去就行)
    api.post('/track/download', {
      platform: osInfo.name, // 告诉后端这是哪个平台的下载
      fingerprint: fingerprint
    }).catch(console.error); // 忽略打点报错，不能影响用户下载

    // 3. 触发真实下载跳转
    window.location.href = osInfo.url;
  };

  useEffect(() => {
    api.get('/hero').then(res => {
      const data = res.data;
      setConfig(data);
      
      // 识别用户操作系统，并将后台配置的对应平台的链接赋给 url
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) {
        setOsInfo({
          name: 'macOS',
          url: data.dlMac, // 【新增】绑定 macOS 链接
          svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10a7.9 7.9 0 0 0 1.5 4.6l5.3 6.9c.3.4.9.4 1.2 0l5.3-6.9A7.9 7.9 0 0 0 20 10c0-4.42-3.58-8-8-8zm0 11.5A3.5 3.5 0 1 1 15.5 10a3.5 3.5 0 0 1-3.5 3.5z"/></svg>'
        });
      } else if (ua.includes('linux')) {
        setOsInfo({ 
          name: 'Linux', 
          url: data.dlLinux, // 【新增】绑定 Linux 链接
          svg: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a9 9 0 0 0-9 9c0 4.1 2.8 7.6 6.6 8.7l2.4-7.1-2-.6.6-1.9 2 .6v-1.6c0-2.2 1.3-3.4 3.3-3.4.9 0 1.9.2 1.9.2v2h-1c-1.1 0-1.4.7-1.4 1.3v1.5h2.3l-.4 1.9h-1.9L13 19.8c3.8-1 6.5-4.5 6.5-8.8a9 9 0 0 0-9-9z"/></svg>' 
        });
      } else {
        setOsInfo({
          name: 'Windows',
          url: data.dlWin, // 【新增】绑定 Windows 链接
          svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5L10 4.5V11H3V5.5ZM11 4.3L21 3V11H11V4.3ZM3 12H10V18.5L3 17.5V12ZM11 12H21V19.7L11 18.2V12Z"/></svg>'
        });
      }
    }).catch(console.error);
  }, []);

  if (!config) return null;

  return (
    <section className="relative pt-16 pb-20 md:pt-28 md:pb-40 overflow-hidden">
      
      {/* 背景霓虹灯 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[128px]"></div>
        <div className="absolute top-20 -right-40 w-96 h-96 rounded-full bg-indigo-400/20 dark:bg-indigo-600/10 blur-[128px]"></div>
      </div>

      <motion.div 
        className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center relative z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        
        {/* 1. 复刻截图的高级深色 Logo 底座 */}
{/* 1. 复刻截图的高级深色 Logo 底座 */}
        <motion.div 
          variants={logoEntry}
          className="mb-8 p-6 md:p-8 rounded-[2rem] shadow-2xl transition-transform hover:scale-105"
          style={{ 
            backgroundColor: '#1C1C1E', // 极具苹果质感的深灰底色
            color: config.logoColor,
            boxShadow: `0 10px 40px ${config.logoColor}33` // 跟随 logo 颜色的微光阴影
          }}
        >
          <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center">
             {/* 【修改】渲染真实的 img 图片标签 */}
             {config.logoUrl && (
               <img 
                 src={config.logoUrl || config.logoSvg /* 兼容旧数据 */} 
                 alt="Hero Logo" 
                 className="w-full h-full object-contain drop-shadow-[0_0_12px_currentColor]" 
               />
             )}
          </div>
        </motion.div>

        {/* 2. 动态大标题 */}
        <motion.h1 variants={heroFadeDown} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter mb-5 md:mb-6 leading-[1.2] md:leading-[1.15]">
          {config.title}
          <span className="block mt-1 md:mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
            {config.subtitle}
          </span>
        </motion.h1>

        {/* 3. 动态介绍文字 (支持 HTML 渲染高亮) */}
        <motion.p 
          variants={heroFadeDown} 
          className={`max-w-2xl text-base sm:text-lg md:text-xl mb-10 md:mb-12 leading-relaxed ${styleTokens.textSecondary}`}
          dangerouslySetInnerHTML={{ __html: config.description }}
        />

        {/* 4. 下载按钮包裹区 */}
        <motion.div variants={heroFadeDown} className="w-full sm:w-auto flex flex-col items-center">
          <motion.a 
            href={osInfo.url} 
            onClick={handleDownloadClick} // 【新增】接管点击事件
            className={styleTokens.btnDownloadFrosted}
            whileHover="hover"
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            <span className="font-bold">{config.buttonText}</span>
            
            <motion.span 
              className="absolute top-0 w-32 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-[25deg] blur-md pointer-events-none"
              variants={buttonShineSweep}
              initial="hidden"
            />
          </motion.a>
          
          {/* 【黑科技区】：智能平台识别与最后更新日期 */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5 px-5 py-2 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
              {/* 动态平台图标 */}
              <div className="w-4 h-4" dangerouslySetInnerHTML={{ __html: osInfo.svg }} />
              <span>For {osInfo.name}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
            <span>最后更新: <span className="font-mono">{config.updateDate}</span></span>
          </div>
          
        </motion.div>

      </motion.div>
    </section>
  );
}
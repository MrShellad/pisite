// frontend/src/components/Features.tsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import { staggerContainer, cardSpringUp } from '../lib/design-tokens';

export default function Features() {
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    api.get('/features').then(res => setFeatures(res.data)).catch(console.error);
  }, []);

  // 根据实际数量智能分配列数
  const gridCols = features.length === 1 ? 'md:grid-cols-1 max-w-lg mx-auto' : 
                   features.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 
                   features.length === 3 ? 'md:grid-cols-3' : 
                   'md:grid-cols-4 lg:grid-cols-4';

  // 【核心修复1】：如果数据还没加载回来，先不渲染，卡住动画的播放时机
  if (features.length === 0) return null;

  return (
    <section id="features" className="py-20 relative z-10">
      <motion.div 
        // 【核心修复2】：把数组长度作为 key，数据一旦出现，强制触发完整的入场动画
        key={features.length} 
        className={`grid grid-cols-1 gap-8 ${gridCols}`}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {features.map((f, index) => (
          <motion.div 
            key={f.id || `feature-${index}`}
            variants={cardSpringUp}
            style={{ 
              '--feature-color': f.iconColor,
              '--feature-glow': `${f.iconColor}4D` 
            } as React.CSSProperties}
            className={`
              group relative p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2
              bg-white/80 dark:bg-neutral-800/90 backdrop-blur-2xl 
              border-2 border-neutral-200/60 dark:border-neutral-700/50
              hover:[border-color:var(--feature-color)] 
              hover:shadow-[0_0_40px_var(--feature-glow)]
            `}
          >
            <div 
              className="w-14 h-14 mb-6 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
              style={{ 
                backgroundColor: `${f.iconColor}1A`, 
                color: f.iconColor 
              }}
            >
              <div 
                 className="w-7 h-7 flex items-center justify-center"
                 dangerouslySetInnerHTML={{ __html: f.iconSvg }}
              />
            </div>
            
            <h3 className="text-xl font-bold mb-3 dark:text-white transition-colors group-hover:text-[var(--feature-color)]">
              {f.title}
            </h3>
            
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-sm">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
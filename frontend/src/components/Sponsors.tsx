// frontend/src/components/Sponsors.tsx
import { useState, useEffect } from 'react';
import { Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, cardSpringUp, styleTokens } from '../lib/design-tokens';
import { api } from '../api/client';
import type { Sponsor } from '../types';

export default function Sponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true); // 新增：加载状态

  useEffect(() => {
    // 前台调用公开接口，此时后端只会返回 enabled = true 的数据
    api.get<Sponsor[]>('/sponsors')
      .then(res => setSponsors(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false)); // 请求结束后关闭加载状态
  }, []);

  // 【核心优化】：如果正在加载，或者加载完发现没有任何赞助商数据，直接返回 null 隐藏整个区块
  if (isLoading || sponsors.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6 pt-2 flex items-center gap-2">
        <Server size={20} className={styleTokens.textSecondary} />
        Power 赞助
      </h2>
      
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {sponsors.map((sponsor) => (
          <motion.a 
            key={sponsor.id}
            href={sponsor.link}
            target="_blank"           // 建议加上：新标签页打开
            rel="noopener noreferrer" // 建议加上：安全属性
            variants={cardSpringUp}
            // 【炫酷改动】直接应用 JSON 里配好的背景色和边框色
            style={{ 
              backgroundColor: sponsor.backgroundColor,
              borderColor: sponsor.borderColor,
            }}
            // 保留毛玻璃和边框效果
            className={`block p-5 rounded-xl border-2 backdrop-blur-md transition-all hover:-translate-y-1`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <img src={sponsor.icon} alt={sponsor.name} className="w-10 h-10 rounded-lg shadow-sm bg-white" />
                <div>
                  <h3 className="text-lg font-bold" style={{ color: sponsor.textColor }}>
                    {sponsor.name}
                  </h3>
                  <p className="text-sm text-neutral-600 font-medium">{sponsor.price}</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-neutral-700 mb-3">{sponsor.desc}</p>
            
            {/* 渲染标签数组 */}
            <div className="flex flex-wrap gap-2 mt-auto">
              {sponsor.tags.map((tag, i) => (
                <span key={i} className="text-xs font-medium px-2 py-1 bg-black/5 text-black/70 rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          </motion.a>
        ))}
      </motion.div>
    </section>
  );
}
// frontend/src/components/FAQ.tsx
import { useState, useEffect } from 'react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, cardSpringUp, accordionContent } from '../lib/design-tokens';
import { api } from '../api/client';

export default function FAQ() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  useEffect(() => {
    api.get('/faqs').then(res => setFaqs(res.data)).catch(console.error);
  }, []);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  if (faqs.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold mb-8 pt-2 flex items-center gap-2">
        <MessageCircle size={24} className="text-blue-500" />
        常见问题
      </h2>
      
      <motion.div 
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {faqs.map((faq, index) => {
          const isOpen = activeIndex === index;
          
          return (
            <motion.div 
              key={faq.id} 
              variants={cardSpringUp} 
              // 加上细微的边框交互和悬浮效果
              className={`
                group rounded-2xl border-2 transition-all duration-300
                ${isOpen 
                  ? 'bg-white dark:bg-neutral-800/80 border-blue-500/30 shadow-lg shadow-blue-500/5' 
                  : 'bg-white/50 dark:bg-neutral-900/50 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'
                }
                backdrop-blur-xl overflow-hidden
              `}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left px-6 py-5 flex items-center justify-between focus-visible:outline-none"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* 【神级还原】：深色底座 + 彩色 SVG 的极致质感 */}
                  <div 
                    className="w-12 h-12 rounded-xl flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    // 底座颜色取深灰色 (neutral-800)，图标颜色取后台动态配置色
                    style={{ backgroundColor: '#262626', color: faq.iconColor }}
                  >
                    <div className="w-5 h-5 flex items-center justify-center drop-shadow-[0_0_8px_currentColor]" dangerouslySetInnerHTML={{ __html: faq.iconSvg }} />
                  </div>
                  
                  <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                    {faq.question}
                  </span>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={`p-2 rounded-full shrink-0 ml-4 ${isOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}
                >
                  <ChevronDown size={20} strokeWidth={2.5} />
                </motion.div>
              </button>
              
              {/* 折叠动画内容区 */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    variants={accordionContent}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <div className="px-6 pb-6 pt-2 pl-[88px] pr-12 leading-relaxed text-sm md:text-base text-neutral-600 dark:text-neutral-400">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { api } from '../api/client';
import { accordionContent, cardSpringUp, staggerContainer } from '../lib/design-tokens';
import { useHomeLocale } from '../lib/home-i18n';

export default function FAQ() {
  const { copy } = useHomeLocale();
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
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <h2 className="mb-8 flex items-center gap-2 pt-2 text-2xl font-bold">
        <MessageCircle size={24} className="text-emerald-500" />
        {copy.faq.title}
      </h2>

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {faqs.map((faq, index) => {
          const isOpen = activeIndex === index;

          return (
            <motion.div
              key={faq.id}
              variants={cardSpringUp}
              className={`
                group overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300
                ${
                  isOpen
                    ? 'border-emerald-500/30 bg-white shadow-lg shadow-emerald-500/5 dark:border-emerald-500/25 dark:bg-neutral-900/80'
                    : 'border-transparent bg-white/60 hover:border-neutral-200 dark:bg-neutral-900/50 dark:hover:border-neutral-700'
                }
              `}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left focus-visible:outline-none"
                aria-expanded={isOpen}
              >
                <div className="flex flex-1 items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: '#14532d', color: faq.iconColor }}
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center drop-shadow-[0_0_8px_currentColor]"
                      dangerouslySetInnerHTML={{ __html: faq.iconSvg }}
                    />
                  </div>

                  <span
                    className={`text-lg font-bold transition-colors ${
                      isOpen
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {faq.question}
                  </span>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className={`ml-4 shrink-0 rounded-full p-2 ${
                    isOpen
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                  }`}
                >
                  <ChevronDown size={20} strokeWidth={2.5} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div variants={accordionContent} initial="hidden" animate="visible" exit="hidden">
                    <div className="px-6 pb-6 pt-2 pl-[88px] pr-12 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-base">
                      {faq.answer}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

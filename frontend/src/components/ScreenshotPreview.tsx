import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { motion } from 'framer-motion';

import { api, getUploadUrl } from '../api/client';
import { useHomeLocale } from '../lib/home-i18n';

type FeatureScreenshot = {
  id: string;
  imageUrl: string;
  title: string;
  caption: string;
  priority: number;
};

export default function ScreenshotPreview() {
  const { copy } = useHomeLocale();
  const [screenshots, setScreenshots] = useState<FeatureScreenshot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    api
      .get<FeatureScreenshot[]>('/feature-screenshots')
      .then(response => setScreenshots(response.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeIndex >= screenshots.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, screenshots.length]);

  useEffect(() => {
    if (screenshots.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % screenshots.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [screenshots.length]);

  const stackedScreenshots = useMemo(() => {
    if (screenshots.length === 0) return [];
    return [0, 1, 2].map(offset => screenshots[(activeIndex + offset) % screenshots.length]).filter(Boolean);
  }, [activeIndex, screenshots]);

  if (screenshots.length === 0) return null;

  const active = screenshots[activeIndex];
  const goToPrevious = () => setActiveIndex(current => (current - 1 + screenshots.length) % screenshots.length);
  const goToNext = () => setActiveIndex(current => (current + 1) % screenshots.length);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 backdrop-blur dark:border-emerald-500/30 dark:bg-white/5 dark:text-emerald-300">
            <Images size={14} />
            {copy.screenshots.eyebrow}
          </div>
          <h2 className="text-3xl font-black tracking-tight text-neutral-950 dark:text-white md:text-4xl">
            {copy.screenshots.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
            {copy.screenshots.subtitle}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={goToPrevious}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-emerald-400"
              aria-label="上一张截图"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-emerald-400"
              aria-label="下一张截图"
            >
              <ChevronRight size={18} />
            </button>
            <div className="ml-2 flex gap-1.5">
              {screenshots.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex
                      ? 'w-8 bg-emerald-500'
                      : 'w-2 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-500'
                  }`}
                  aria-label={`查看第 ${index + 1} 张截图`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <div className="relative mx-auto h-[280px] w-full max-w-4xl sm:h-[420px] lg:h-[500px]">
          <motion.div
            className="pointer-events-none absolute -inset-4 rounded-[36px] border border-emerald-200/60 bg-white/20 shadow-[0_40px_120px_rgba(15,118,110,0.18)] backdrop-blur-xl dark:border-emerald-400/10 dark:bg-white/[0.03]"
            animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.985, 1.01, 0.985] }}
            transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {stackedScreenshots
            .slice()
            .reverse()
            .map((item, reverseIndex) => {
              const stackIndex = stackedScreenshots.length - reverseIndex - 1;
              const isActive = stackIndex === 0;

              return (
                <motion.div
                  key={`${item.id}-${activeIndex}-${stackIndex}`}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-neutral-950"
                  initial={{ opacity: 0, y: 18, rotate: 0, scale: 0.94 }}
                  animate={{
                    opacity: isActive ? 1 : 0.65,
                    y: stackIndex * 18,
                    x: stackIndex * 18,
                    rotate: stackIndex * -3,
                    scale: 1 - stackIndex * 0.055,
                    zIndex: 10 - stackIndex,
                  }}
                  transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                >
                  <img
                    src={getUploadUrl(item.imageUrl)}
                    alt={item.title || '截图预览'}
                    className="h-full w-full object-cover"
                  />
                  {isActive && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 text-white sm:p-7">
                      <div className="max-w-2xl">
                        {active.title && <h3 className="text-lg font-black sm:text-2xl">{active.title}</h3>}
                        {active.caption && <p className="mt-2 text-xs leading-5 text-white/75 sm:text-sm">{active.caption}</p>}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

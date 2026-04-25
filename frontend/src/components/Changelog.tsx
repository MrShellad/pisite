import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import { useHomeLocale } from '../lib/home-i18n';

export default function Changelog({ isFullPage = false }: { isFullPage?: boolean }) {
  const { copy } = useHomeLocale();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/changelog').then(res => setLogs(res.data)).catch(console.error);
  }, []);

  if (logs.length === 0) return null;

  const renderHighlightedText = (text: string, color: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const innerText = part.slice(2, -2);
        return (
          <span
            key={index}
            className="mx-1 inline-block rounded px-1.5 py-0.5 text-xs font-bold"
            style={{ color, backgroundColor: `${color}26` }}
          >
            {innerText}
          </span>
        );
      }

      return (
        <span key={index} className="leading-loose">
          {part}
        </span>
      );
    });
  };

  const displayLogs = isFullPage ? logs : logs.slice(0, 3);

  return (
    <section className={`${isFullPage ? 'pb-20 pt-32' : 'relative z-10 py-20'}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold dark:text-white">
            {isFullPage ? copy.changelog.pageTitle : copy.changelog.homeTitle}
          </h2>
          {isFullPage ? <p className="mt-4 text-neutral-500">{copy.changelog.pageSubtitle}</p> : null}
        </div>

        <div className="relative ml-4 border-l-2 border-emerald-200/70 pb-4 dark:border-emerald-900/50 md:ml-6">
          {displayLogs.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative mb-12 pl-8 md:pl-12"
            >
              <div className="relative mb-4 flex items-center">
                <div
                  className={`absolute -left-[41px] h-4 w-4 rounded-full border-4 border-white dark:border-neutral-950 md:-left-[57px] ${
                    entry.isLatest
                      ? 'animate-pulse bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.75)]'
                      : 'bg-emerald-300 dark:bg-emerald-700'
                  }`}
                />

                <span className="text-sm font-mono font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
                  {entry.date}
                </span>
              </div>

              <div
                className="
                  relative overflow-hidden rounded-[2rem] border-2 border-emerald-200/70
                  bg-gradient-to-br from-emerald-50/90 to-lime-50/40 p-8 backdrop-blur-2xl
                  dark:border-emerald-900/45 dark:from-emerald-950/30 dark:to-neutral-900/60
                "
              >
                {entry.isLatest ? (
                  <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
                ) : null}

                <div className="relative z-10 mb-8 flex items-center gap-4 border-b-2 border-emerald-100/70 pb-6 dark:border-emerald-900/40">
                  <h3 className="text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">
                    {entry.version}
                  </h3>
                  {entry.isLatest ? (
                    <span className="rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-3 py-1 text-[10px] font-bold uppercase text-white">
                      {copy.changelog.latest}
                    </span>
                  ) : null}
                </div>

                <div className="relative z-10 space-y-6">
                  {entry.changes.map((item: any, index: number) => (
                    <div key={index} className="group flex items-start gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                        style={{ backgroundColor: `${item.iconColor}1A`, color: item.iconColor }}
                      >
                        <div
                          className="flex h-5 w-5 items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                        />
                      </div>
                      <div className="flex-1 pt-1 text-sm leading-loose text-neutral-700 dark:text-neutral-300">
                        {renderHighlightedText(item.text, item.iconColor)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!isFullPage && logs.length > 3 ? (
          <div className="relative z-10 mt-8 text-center">
            <Link
              to="/changelog"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-emerald-200 bg-white/70 px-8 py-3.5 font-bold text-emerald-700 backdrop-blur-md transition-colors duration-300 hover:border-emerald-500 hover:bg-emerald-600 hover:text-white dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-600"
            >
              {copy.changelog.viewAll} &rarr;
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

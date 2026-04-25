import { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import { motion } from 'framer-motion';

import { api } from '../api/client';
import { cardSpringUp, staggerContainer } from '../lib/design-tokens';
import { useHomeLocale } from '../lib/home-i18n';
import type { Sponsor } from '../types';

export default function Sponsors() {
  const { copy } = useHomeLocale();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Sponsor[]>('/sponsors')
      .then(res => setSponsors(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || sponsors.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <h2 className="mb-6 flex items-center gap-2 pt-2 text-2xl font-bold">
        <Server size={20} className="text-emerald-600 dark:text-emerald-300" />
        {copy.sponsors.title}
      </h2>

      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {sponsors.map(sponsor => (
          <motion.a
            key={sponsor.id}
            href={sponsor.link}
            target="_blank"
            rel="noopener noreferrer"
            variants={cardSpringUp}
            style={{
              backgroundColor: sponsor.backgroundColor,
              borderColor: sponsor.borderColor,
            }}
            className="block rounded-xl border-2 p-5 backdrop-blur-md transition-all hover:-translate-y-1"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src={sponsor.icon} alt={sponsor.name} className="h-10 w-10 rounded-lg bg-white shadow-sm" />
                <div>
                  <h3 className="text-lg font-bold" style={{ color: sponsor.textColor }}>
                    {sponsor.name}
                  </h3>
                  <p className="text-sm font-medium text-neutral-600">{sponsor.price}</p>
                </div>
              </div>
            </div>

            <p className="mb-3 text-sm text-neutral-700">{sponsor.desc}</p>

            <div className="mt-auto flex flex-wrap gap-2">
              {sponsor.tags.map((tag, index) => (
                <span key={index} className="rounded-md bg-black/5 px-2 py-1 text-xs font-medium text-black/70">
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

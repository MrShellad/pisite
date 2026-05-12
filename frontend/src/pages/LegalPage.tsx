import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

import { api } from '../api/client';
import type { LegalPage as LegalPageData } from '../types';
import { useDynamicSEO } from './admin/hooks/useDynamicSEO';

export default function LegalPage() {
  useDynamicSEO();
  const location = useLocation();
  const legalSlug = location.pathname === '/terms' ? 'terms' : 'privacy';
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    api
      .get<LegalPageData>(`/legal-pages/${legalSlug}`)
      .then((response) => {
        if (mounted) setPage(response.data);
      })
      .catch((requestError) => {
        console.error(requestError);
        if (mounted) setError('页面内容暂时无法加载。');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [legalSlug]);

  const fallbackTitle = useMemo(() => (legalSlug === 'privacy' ? '隐私政策' : '服务条款'), [legalSlug]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50/45 to-amber-50/30 px-4 py-10 text-neutral-900 transition-colors duration-500 dark:from-[#04130a] dark:via-[#071426] dark:to-[#050505] dark:text-neutral-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/75 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm backdrop-blur transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-emerald-400/40 dark:hover:text-emerald-300"
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>

        <header className="mb-8 border-b border-neutral-200/70 pb-8 dark:border-white/10">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <FileText size={20} />
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{page?.title ?? fallbackTitle}</h1>
          {page?.updatedAt ? (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">最后更新：{page.updatedAt}</p>
          ) : null}
        </header>

        {isLoading ? (
          <div className="animate-pulse rounded-2xl border border-neutral-200 bg-white/70 px-5 py-16 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
            正在加载页面内容...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-12 text-center text-sm font-semibold text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : (
          <article
            className="prose prose-neutral max-w-none rounded-2xl border border-neutral-200/70 bg-white/80 p-6 shadow-sm backdrop-blur prose-a:text-emerald-700 prose-headings:tracking-tight dark:prose-invert dark:border-white/10 dark:bg-white/[0.03] dark:prose-a:text-emerald-300 sm:p-8"
            dangerouslySetInnerHTML={{ __html: page?.contentHtml || '<p>暂无内容。</p>' }}
          />
        )}
      </div>
    </main>
  );
}

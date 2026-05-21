import { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { api } from '@/api/client';
import type { LegalPage } from '@/types';
import { useAdminFeedback } from './components/AdminFeedback';

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

export default function ManageLegalPages() {
  const { notify } = useAdminFeedback();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [activeSlug, setActiveSlug] = useState<LegalPage['slug']>('privacy');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const activePage = useMemo(
    () => pages.find((page) => page.slug === activeSlug) ?? pages[0] ?? null,
    [activeSlug, pages],
  );

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<LegalPage[]>('/admin/legal-pages');
      setPages(response.data);
      if (response.data.length > 0 && !response.data.some((page) => page.slug === activeSlug)) {
        setActiveSlug(response.data[0].slug);
      }
    } catch (error) {
      console.error(error);
      notify('隐私与条款读取失败', '请检查网络或服务端日志。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPages();
  }, []);

  const updateActivePage = (patch: Partial<LegalPage>) => {
    setPages((current) => current.map((page) => (page.slug === activeSlug ? { ...page, ...patch } : page)));
  };

  const saveActivePage = async () => {
    if (!activePage) return;

    setIsSaving(true);
    try {
      const response = await api.put<LegalPage>(`/admin/legal-pages/${activePage.slug}`, {
        title: activePage.title.trim(),
        contentHtml: activePage.contentHtml,
      });
      setPages((current) => current.map((page) => (page.slug === response.data.slug ? response.data : page)));
      notify('页面内容已保存', response.data.title, 'success');
    } catch (error: any) {
      console.error(error);
      notify('保存失败', error?.response?.data ?? '请检查标题和正文内容。', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/60 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-black/35 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:bg-orange-500/5';
  const cardClass =
    'rounded-2xl border border-neutral-200/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none';

  if (isLoading) {
    return <div className="animate-pulse text-sm text-neutral-500 dark:text-neutral-400">正在加载隐私与条款...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
            <FileText className="text-orange-500" />
            隐私与条款
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            维护前台底部链接展示的隐私政策和服务条款正文。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchPages()}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
          >
            <RefreshCw size={16} />
            刷新
          </button>
          <button
            type="button"
            onClick={() => void saveActivePage()}
            disabled={!activePage || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            <Save size={16} />
            {isSaving ? '保存中...' : '保存页面'}
          </button>
        </div>
      </div>

      <section className={cardClass}>
        <div className="mb-5 inline-flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/[0.04]">
          {pages.map((page) => {
            const isActive = page.slug === activeSlug;
            return (
              <button
                key={page.slug}
                type="button"
                onClick={() => setActiveSlug(page.slug)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  isActive
                    ? 'bg-white text-orange-600 shadow-sm dark:bg-orange-500/15 dark:text-orange-300 dark:shadow-none'
                    : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100'
                }`}
              >
                {page.slug === 'privacy' ? '隐私政策' : '服务条款'}
              </button>
            );
          })}
        </div>

        {activePage ? (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                页面标题
              </label>
              <input
                value={activePage.title}
                onChange={(event) => updateActivePage({ title: event.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                页面正文
              </label>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950">
                <ReactQuill
                  theme="snow"
                  value={activePage.contentHtml}
                  onChange={(value) => updateActivePage({ contentHtml: value })}
                  modules={quillModules}
                  className="min-h-[460px] [&_.ql-container]:min-h-[400px] [&_.ql-container]:border-neutral-200 dark:[&_.ql-container]:border-white/10 [&_.ql-editor]:min-h-[400px] dark:[&_.ql-editor]:bg-neutral-950 dark:[&_.ql-editor]:text-neutral-100 dark:[&_.ql-editor.ql-blank:before]:text-neutral-500 [&_.ql-toolbar]:border-neutral-200 dark:[&_.ql-toolbar]:border-white/10 dark:[&_.ql-toolbar]:bg-neutral-900/80 dark:[&_.ql-toolbar_.ql-fill]:fill-neutral-300 dark:[&_.ql-toolbar_.ql-picker]:text-neutral-300 dark:[&_.ql-toolbar_.ql-stroke]:stroke-neutral-300"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-12 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            暂无可编辑页面。
          </div>
        )}
      </section>
    </div>
  );
}

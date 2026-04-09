import { useEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { Check, Search, X } from 'lucide-react';

import { api } from '@/api/client';
import { isLikelyMcVersion, normalizeMcVersionId } from '@/lib/minecraft';

interface VersionTagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

interface McVersion {
  id: string;
  vType: string;
  releaseTime: string;
}

const PAGE_SIZE = 25;

function mergeOptions(current: McVersion[], incoming: McVersion[]) {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];

  incoming.forEach((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  });

  return merged;
}

export default function VersionTagEditor({
  tags,
  onChange,
  placeholder = '搜索并选择 Minecraft 版本',
}: VersionTagEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const latestRequestRef = useRef(0);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<McVersion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchVersions = async (search: string, nextOffset: number, reset: boolean) => {
    if (isLoading && !reset) return;

    const requestId = reset ? latestRequestRef.current + 1 : latestRequestRef.current;
    if (reset) {
      latestRequestRef.current = requestId;
    }

    setIsLoading(true);

    try {
      const response = await api.get<McVersion[]>('/mc/versions', {
        params: {
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        },
      });

      if (requestId !== latestRequestRef.current) {
        return;
      }

      const loaded = response.data ?? [];
      setOptions((current) => (reset ? loaded : mergeOptions(current, loaded)));
      setOffset(nextOffset + loaded.length);
      setHasMore(loaded.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to fetch MC versions', error);
      if (reset) {
        setOptions([]);
        setOffset(0);
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDropdownOpen) return;

    const timer = window.setTimeout(() => {
      void fetchVersions(inputValue, 0, true);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [inputValue, isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addVersion = (value: string) => {
    const normalized = normalizeMcVersionId(value);
    if (!normalized || tags.includes(normalized)) return;
    onChange([...tags, normalized]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const normalized = normalizeMcVersionId(inputValue);
    if (!normalized) return;

    if (!isLikelyMcVersion(normalized)) {
      window.alert('请输入有效的 Minecraft 版本号，例如 1.20.1、24w13a 或 1.21-rc1。');
      return;
    }

    addVersion(normalized);
    setInputValue('');
    setIsDropdownOpen(false);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasMore || isLoading) return;

    const element = event.currentTarget;
    const isNearBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 32;

    if (isNearBottom) {
      void fetchVersions(inputValue, offset, false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200/60 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-orange-300 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                className="rounded-full p-0.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search size={16} className="text-neutral-400 dark:text-neutral-500" />
        </div>
        <input
          type="text"
          className="w-full rounded-2xl border border-neutral-200 bg-white/85 py-3 pl-11 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-100"
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}
      </div>

      {isDropdownOpen && (
        <div
          className="custom-scrollbar absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white/95 p-1.5 shadow-xl shadow-black/5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95"
          onScroll={handleScroll}
        >
          {options.length === 0 && !isLoading && (
            <div className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              没有找到匹配版本，按回车可手动添加。
            </div>
          )}

          {options.map((option) => {
            const isSelected = tags.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  addVersion(option.id);
                  setInputValue('');
                  setIsDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{option.id}</span>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
                      option.vType === 'release'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400'
                    }`}
                  >
                    {option.vType === 'release' ? '正式版' : '快照 / 预发布'}
                  </span>
                </div>
                {isSelected && <Check size={16} />}
              </button>
            );
          })}

          {hasMore && options.length > 0 && (
            <div className="px-4 py-3 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
              向下滚动继续加载更多版本
            </div>
          )}
        </div>
      )}
    </div>
  );
}

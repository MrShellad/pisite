import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check } from 'lucide-react';

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

export default function VersionTagEditor({ tags, onChange, placeholder = '搜索并选择对应的 MC 版本' }: VersionTagEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<McVersion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVersions(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const fetchVersions = async (search: string) => {
    setIsLoading(true);
    try {
      // 假设使用原生的 fetch 或者如果配置了代理可以使用 /api/mc/versions
      // 如果统一了 baseURL，也可以使用 axios 实例
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/mc/versions?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      }
    } catch (error) {
      console.error('Failed to fetch versions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputValue.trim();
      if (!val) return;
      if (!tags.includes(val)) {
        onChange([...tags, val]);
      }
      setInputValue('');
      setIsDropdownOpen(false);
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const selectVersion = (versionId: string) => {
    if (!tags.includes(versionId)) {
      onChange([...tags, versionId]);
    }
    setInputValue('');
    setIsDropdownOpen(false);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full relative" ref={wrapperRef}>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200/60 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-orange-300 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="rounded-full p-0.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition dark:hover:bg-red-500/10"
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
          className="w-full rounded-2xl border border-neutral-200 bg-white/85 py-3 pl-11 pr-4 text-sm text-neutral-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:bg-neutral-900/70 dark:border-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {isDropdownOpen && options.length > 0 && (
        <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white/95 p-1.5 shadow-xl shadow-black/5 backdrop-blur custom-scrollbar dark:border-neutral-800 dark:bg-neutral-900/95">
          {options.map((opt) => {
            const isSelected = tags.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectVersion(opt.id)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all
                  ${isSelected
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span>{opt.id}</span>
                  <span className={`text-[10px] rounded-md px-1.5 py-0.5 border ${
                    opt.vType === 'release' 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' 
                    : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400'
                  }`}>
                    {opt.vType === 'release' ? '正式版' : '快照版'}
                  </span>
                </div>
                {isSelected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// frontend/src/pages/ServerSubmission/components/IconTagEditor.tsx
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { IconTag } from '@/types';
import type { ServerTagDict } from '../useServerSubmission';

interface Props {
  title: string;
  tags: IconTag[];
  dictItems: ServerTagDict[]; // 从数据库传进来的对应分类字典
  fallbackColor: string;      // 兜底色
  onChange: (tags: IconTag[]) => void;
}

export default function IconTagEditor({ title, tags, dictItems, fallbackColor, onChange }: Props) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // 过滤掉已经选择的标签
  const availableItems = dictItems.filter(
    (item) => !tags.find((t) => t.label === item.label)
  );

  const handleSelect = (item: ServerTagDict) => {
    // 优先使用数据库配置的颜色，如果没有配置则使用组件传进来的兜底色
    const itemColor = item.color || fallbackColor;
    onChange([...tags, { label: item.label, iconSvg: item.iconSvg, color: itemColor }]);
    setIsPickerOpen(false);
  };

  const removeTag = (labelToRemove: string) => {
    onChange(tags.filter((t) => t.label !== labelToRemove));
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="text-sm font-bold text-neutral-700 dark:text-neutral-100">{title}</div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div 
            key={tag.label} 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border shadow-sm transition-transform hover:-translate-y-0.5 dark:bg-neutral-950/70"
            style={{ borderColor: `${tag.color}40`, color: tag.color }}
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0" dangerouslySetInnerHTML={{ __html: tag.iconSvg }} />
            <span className="text-xs font-bold whitespace-nowrap">{tag.label}</span>
            <button
              type="button"
              onClick={() => removeTag(tag.label)}
              className="ml-1 p-0.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-red-500 transition-colors dark:hover:bg-neutral-800"
            >
              <X size={14}/>
            </button>
          </div>
        ))}

        <div className="relative">
          <button 
            type="button" 
            onClick={() => setIsPickerOpen(!isPickerOpen)} 
            disabled={availableItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-500 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-950/70 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <Plus size={14}/> {availableItems.length === 0 ? '已全部添加' : '选择标签'}
          </button>

          {isPickerOpen && availableItems.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsPickerOpen(false)} />
              <div className="absolute top-10 left-0 z-20 w-52 p-2 bg-white border border-neutral-200 rounded-xl shadow-2xl flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200 dark:bg-neutral-950/95 dark:border-neutral-800">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 px-2 pt-1 dark:text-neutral-500">
                  选择预设项
                </div>
                {availableItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors group dark:hover:bg-neutral-900"
                  >
                    <div 
                      className="w-4 h-4 flex items-center justify-center transition-colors group-hover:opacity-100 opacity-60" 
                      style={{ color: item.color || fallbackColor }}
                      dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                    />
                    <span className="text-xs font-semibold text-neutral-600 group-hover:text-neutral-900 whitespace-nowrap dark:text-neutral-300 dark:group-hover:text-neutral-50">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// frontend/src/pages/ServerSubmission/components/StringTagEditor.tsx
import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  tags: string[];
  placeholder?: string;
  validateRegex?: RegExp; // 新增：正则拦截
  errorMsg?: string;      // 新增：拦截时的报错提示语
  onChange: (tags: string[]) => void;
}

export default function StringTagEditor({ tags, placeholder, validateRegex, errorMsg, onChange }: Props) {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 监听回车键添加标签
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const val = inputValue.trim();
      
      // 【安全校验】前台正则拦截
      if (validateRegex && !validateRegex.test(val)) {
        alert(errorMsg || "格式错误，请检查输入内容");
        return;
      }

      // 防止重复添加
      if (!tags.includes(val)) {
        onChange([...tags, val]);
      }
      
      // 添加成功后清空输入框
      setInputValue('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      {/* 已添加的标签展示区 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white shadow-sm text-neutral-700 text-xs font-bold rounded-lg border border-neutral-200 transition-transform hover:-translate-y-0.5 dark:bg-neutral-950/70 dark:text-neutral-200 dark:border-neutral-800"
            >
              {tag} 
              <button 
                type="button" 
                onClick={() => removeTag(tag)} 
                className="ml-1 p-0.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-red-500 transition-colors dark:hover:bg-neutral-800"
                title="移除该标签"
              >
                <X size={14}/>
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* 文本输入框 */}
      <input 
        value={inputValue} 
        onChange={e => setInputValue(e.target.value)} 
        onKeyDown={handleKeyDown} 
        placeholder={placeholder || "输入内容后按回车添加..."} 
        className="w-full rounded-xl border border-neutral-200 bg-white/85 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:bg-neutral-900/70 dark:border-neutral-700 dark:text-neutral-100" 
      />
    </div>
  );
}
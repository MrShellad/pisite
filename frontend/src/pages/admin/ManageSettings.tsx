import {
  ArrowDown,
  ArrowUp,
  Globe,
  Link2,
  Plus,
  Save,
  Search,
  Settings,
  Share2,
  Trash2,
} from 'lucide-react';

import { useSettings } from './hooks/useSettings';

export default function ManageSettings() {
  const {
    formData,
    isSaving,
    handleChange,
    handleFriendChange,
    addFriendLink,
    removeFriendLink,
    moveFriendLink,
    handleSubmit,
  } = useSettings();

  const inputClass =
    'w-full rounded-xl border border-neutral-200 bg-neutral-100/50 px-4 py-3 text-sm text-neutral-900 transition-all focus:border-blue-500/50 focus:bg-blue-50/50 focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white dark:focus:bg-blue-500/5';
  const labelClass =
    'mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400';
  const cardClass =
    'relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none';

  if (!formData) {
    return <div className="animate-pulse text-neutral-500">正在加载配置...</div>;
  }

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <h2 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
        <Settings className="text-blue-500" /> 全局系统设置
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className={cardClass}>
          <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
            <Globe size={18} className="text-blue-500" /> 基础与版权信息
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>全局站点名称</label>
              <input
                required
                value={formData.siteName}
                onChange={event => handleChange('siteName', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>底部版权声明</label>
              <input
                required
                value={formData.copyright}
                onChange={event => handleChange('copyright', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
            <Search size={18} className="text-emerald-500" /> SEO 搜索引擎优化
          </h3>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>浏览器标题</label>
              <input
                required
                value={formData.seoTitle}
                onChange={event => handleChange('seoTitle', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>网站描述</label>
              <textarea
                required
                value={formData.seoDescription}
                onChange={event => handleChange('seoDescription', event.target.value)}
                className={`${inputClass} h-24`}
              />
            </div>
            <div>
              <label className={labelClass}>关键词</label>
              <input
                required
                value={formData.seoKeywords}
                onChange={event => handleChange('seoKeywords', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-6 flex items-center gap-2 border-b border-neutral-200 pb-4 font-bold text-neutral-900 dark:border-white/10 dark:text-white">
            <Share2 size={18} className="text-purple-500" /> 社交与联系方式
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>联系邮箱</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={event => handleChange('contactEmail', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>GitHub URL</label>
              <input
                value={formData.githubUrl}
                onChange={event => handleChange('githubUrl', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>X (Twitter) URL</label>
              <input
                value={formData.twitterUrl}
                onChange={event => handleChange('twitterUrl', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Discord URL</label>
              <input
                value={formData.discordUrl}
                onChange={event => handleChange('discordUrl', event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-white/10">
            <h3 className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <Link2 size={18} className="text-orange-500" /> 友情链接
            </h3>
            <button
              type="button"
              onClick={addFriendLink}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <Plus size={16} /> 新增友链
            </button>
          </div>

          <div className="space-y-4">
            {formData.friendLinks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-10 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-black/20 dark:text-neutral-400">
                当前还没有友链，点击右上角按钮新增。
              </div>
            ) : (
              formData.friendLinks.map((friend, index) => (
                <div
                  key={friend.id}
                  className="rounded-2xl border border-neutral-200/70 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr_auto]">
                    <div>
                      <label className={labelClass}>名称</label>
                      <input
                        value={friend.name}
                        onChange={event => handleFriendChange(index, 'name', event.target.value)}
                        className={inputClass}
                        placeholder="例如：Minecraft Wiki"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>跳转地址</label>
                      <input
                        type="url"
                        value={friend.href}
                        onChange={event => handleFriendChange(index, 'href', event.target.value)}
                        className={inputClass}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                      <label className="flex h-12 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200">
                        <input
                          type="checkbox"
                          checked={friend.enabled}
                          onChange={event => handleFriendChange(index, 'enabled', event.target.checked)}
                          className="h-4 w-4 rounded accent-blue-500"
                        />
                        显示
                      </label>

                      <button
                        type="button"
                        onClick={() => moveFriendLink(index, -1)}
                        disabled={index === 0}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                        title="上移"
                      >
                        <ArrowUp size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveFriendLink(index, 1)}
                        disabled={index === formData.friendLinks.length - 1}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                        title="下移"
                      >
                        <ArrowDown size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFriendLink(index)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 font-black tracking-wide text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black"
        >
          <Save size={20} /> {isSaving ? '保存中...' : '保存全局设置'}
        </button>
      </form>
    </div>
  );
}

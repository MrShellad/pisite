// frontend/src/pages/ChangelogPage.tsx
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Changelog from '../components/Changelog';
import { styleTokens } from '../lib/design-tokens';

export default function ChangelogPage() {
  return (
    <div className={`
      min-h-screen flex flex-col font-sans transition-colors duration-500 ${styleTokens.textPrimary}
      bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 
      dark:from-blue-950 dark:via-indigo-950 dark:to-slate-950
    `}>
      <Navbar />
      
      {/* 核心区：传递 isFullPage={true}，强制展示所有日志并隐藏底部按钮 */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Changelog isFullPage={true} />
      </main>

      <Footer />
    </div>
  );
}
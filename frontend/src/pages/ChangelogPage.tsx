import Changelog from '../components/Changelog';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { styleTokens } from '../lib/design-tokens';

export default function ChangelogPage() {
  return (
    <div
      className={`
        min-h-screen flex flex-col font-sans transition-colors duration-500 ${styleTokens.textPrimary}
        bg-gradient-to-r from-emerald-50 via-lime-50 to-stone-50
        dark:from-[#04130a] dark:via-[#07180d] dark:to-[#050505]
      `}
    >
      <Navbar />

      <main className="mx-auto flex-1 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <Changelog isFullPage={true} />
      </main>

      <Footer />
    </div>
  );
}

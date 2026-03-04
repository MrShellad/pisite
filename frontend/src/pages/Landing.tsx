// 示例：在你的 Landing.tsx 中
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import FAQ from '../components/FAQ';
import Changelog from '../components/Changelog';
import Sponsors from '../components/Sponsors';
import Footer from '../components/Footer';
import { useDynamicSEO } from './admin/hooks/useDynamicSEO';
export default function Landing() {
  
  useDynamicSEO();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] transition-colors duration-500">
      <Navbar />
      
      {/* 确保每个组件的外层或这里包裹一个对应的 id */}
      <Hero />
      
      <div id="features">
        <Features />
      </div>
      
      <div id="faq">
        <FAQ />
      </div>
      
      <div id="changelog">
        <Changelog />
      </div>

      <div id="sponsors">
        <Sponsors />
      </div>
      
      <Footer />
    </div>
  );
}
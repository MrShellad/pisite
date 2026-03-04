// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminLayout from './pages/admin/AdminLayout';
import RequireAuth from './pages/admin/RequireAuth'; // 【新增】
import Login from './pages/admin/Login';             // 【新增】
import ManageSponsors from './pages/admin/ManageSponsors'; 
import Setup from './pages/admin/Setup';
import ManageFeatures from './pages/admin/ManageFeatures'; // 【新增】
import ManageChangelog from './pages/admin/ManageChangelog'; // 【新增】
import ChangelogPage from './pages/ChangelogPage'; // 【新增】前台更新日志页面
import ManageFAQ from './pages/admin/ManageFAQ'; // 【新增】FAQ 管理
import ManageHero from './pages/admin/ManageHero'; // 【新增】Hero 区管理
import Dashboard from './pages/admin/Dashboard';
import ManageSettings from './pages/admin/ManageSettings';
import ManageMcCrawler from './pages/admin/ManageMcCrawler';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        {/* 【新增】独立的后台登录页面路由 */}
        <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/setup" element={<Setup />} />
        {/* 【修改】用 RequireAuth 守卫包裹整个后台布局 */}
        <Route element={<RequireAuth />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="sponsors" element={<ManageSponsors />} />
            <Route path="features" element={<ManageFeatures />} />
            <Route path="changelog" element={<ManageChangelog />} />
            <Route path="faqs" element={<ManageFAQ />} />
            <Route path="hero" element={<ManageHero />} />
            <Route path="settings" element={<ManageSettings />} />
            <Route path="mccrawler" element={<ManageMcCrawler />} />
          </Route>
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
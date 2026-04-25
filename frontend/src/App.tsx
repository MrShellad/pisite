import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { HomeLocaleProvider } from './lib/home-i18n';

const Landing = lazy(() => import('./pages/Landing'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const ServerSubmissionPage = lazy(() => import('./pages/ServerSubmission'));
const ServerSuccessPreview = lazy(() => import('./pages/ServerSubmission/SuccessPreview'));
const Login = lazy(() => import('./pages/admin/Login'));
const Setup = lazy(() => import('./pages/admin/Setup'));
const RequireAuth = lazy(() => import('./pages/admin/RequireAuth'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ManageHero = lazy(() => import('./pages/admin/ManageHero'));
const ManageFeatures = lazy(() => import('./pages/admin/ManageFeatures'));
const ManageChangelog = lazy(() => import('./pages/admin/ManageChangelog'));
const ManageFAQ = lazy(() => import('./pages/admin/ManageFAQ'));
const ManageSponsors = lazy(() => import('./pages/admin/ManageSponsors'));
const ManageDonorUsers = lazy(() => import('./pages/admin/ManageDonorUsers'));
const ManageApiKeys = lazy(() => import('./pages/admin/ManageApiKeys'));
const ManageApiAccess = lazy(() => import('./pages/admin/ManageApiAccess'));
const ManageSettings = lazy(() => import('./pages/admin/ManageSettings'));
const ManageSubmissionEmail = lazy(() => import('./pages/admin/ManageSubmissionEmail'));
const ManageAdminProfile = lazy(() => import('./pages/admin/ManageAdminProfile'));
const ManageMcCrawler = lazy(() => import('./pages/admin/ManageMcCrawler'));
const ManageServerSubmissions = lazy(() => import('./pages/admin/ManageServerSubmissions'));
const ManageServerTags = lazy(() => import('./pages/admin/ManageServerTags'));
const ManageSignalingServers = lazy(() => import('./pages/admin/ManageSignalingServers'));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 via-lime-50/40 to-stone-50 text-sm font-medium text-emerald-700 dark:from-[#04130a] dark:via-[#07180d] dark:to-[#050505] dark:text-emerald-300">
      Loading page...
    </div>
  );
}

function App() {
  return (
    <HomeLocaleProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/servers/submit" element={<ServerSubmissionPage />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/setup" element={<Setup />} />
            <Route path="/servers/submit/success" element={<ServerSuccessPreview />} />
            <Route element={<RequireAuth />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="hero" element={<ManageHero />} />
                <Route path="features" element={<ManageFeatures />} />
                <Route path="changelog" element={<ManageChangelog />} />
                <Route path="faqs" element={<ManageFAQ />} />
                <Route path="sponsors" element={<ManageSponsors />} />
                <Route path="donors" element={<ManageDonorUsers />} />
                <Route path="api-keys" element={<ManageApiKeys />} />
                <Route path="api-access" element={<ManageApiAccess />} />
                <Route path="settings" element={<ManageSettings />} />
                <Route path="submission-email" element={<ManageSubmissionEmail />} />
                <Route path="account" element={<ManageAdminProfile />} />
                <Route path="mccrawler" element={<ManageMcCrawler />} />
                <Route path="server-submissions" element={<ManageServerSubmissions />} />
                <Route path="server-tags" element={<ManageServerTags />} />
                <Route path="signaling" element={<ManageSignalingServers />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HomeLocaleProvider>
  );
}

export default App;

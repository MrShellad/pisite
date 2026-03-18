import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Landing from './pages/Landing';
import ChangelogPage from './pages/ChangelogPage';
import ServerSubmissionPage from './pages/ServerSubmission';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Login from './pages/admin/Login';
import ManageChangelog from './pages/admin/ManageChangelog';
import ManageFAQ from './pages/admin/ManageFAQ';
import ManageFeatures from './pages/admin/ManageFeatures';
import ManageHero from './pages/admin/ManageHero';
import ManageMcCrawler from './pages/admin/ManageMcCrawler';
import ManageServerSubmissions from './pages/admin/ManageServerSubmissions';
import ManageSettings from './pages/admin/ManageSettings';
import ManageSponsors from './pages/admin/ManageSponsors';
import RequireAuth from './pages/admin/RequireAuth';
import Setup from './pages/admin/Setup';
import ManageServerTags from './pages/admin/ManageServerTags';
import ServerSuccessPreview from './pages/ServerSubmission/SuccessPreview';
import ManageDonorUsers from './pages/admin/ManageDonorUsers';
import ManageApiKeys from './pages/admin/ManageApiKeys';
import ManageApiAccess from './pages/admin/ManageApiAccess';

function App() {
  return (
    <BrowserRouter>
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
            <Route path="mccrawler" element={<ManageMcCrawler />} />
            <Route path="server-submissions" element={<ManageServerSubmissions />} />
            <Route path="server-tags" element={<ManageServerTags />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

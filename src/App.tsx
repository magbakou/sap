/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CatechumensList } from './pages/CatechumensList';
import { CatechumenDetail } from './pages/CatechumenDetail';
import { CatechumenForm } from './pages/CatechumenForm';
import { ReportCardForm } from './pages/ReportCardForm';
import { ReportDetail } from './pages/ReportDetail';
import { SacramentsManagement } from './pages/SacramentsManagement';
import { ReportsManagement } from './pages/ReportsManagement';
import { SubjectsManagement } from './pages/SubjectsManagement';
import { Profile } from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/catechumens" element={<Layout><CatechumensList /></Layout>} />
          <Route path="/catechumens/new" element={<Layout><CatechumenForm /></Layout>} />
          <Route path="/catechumens/:id" element={<Layout><CatechumenDetail /></Layout>} />
          <Route path="/catechumens/:id/edit" element={<Layout><CatechumenForm /></Layout>} />
          <Route path="/catechumens/:id/add-report" element={<Layout><ReportCardForm /></Layout>} />
          <Route path="/reports/new" element={<Layout><ReportCardForm /></Layout>} />
          <Route path="/reports/:id/edit" element={<Layout><ReportCardForm /></Layout>} />
          <Route path="/reports/:id" element={<Layout><ReportDetail /></Layout>} />
          <Route path="/all-reports" element={<Layout><ReportsManagement /></Layout>} />
          <Route path="/subjects" element={<Layout><SubjectsManagement /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}


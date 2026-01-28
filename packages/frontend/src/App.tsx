import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardLayout from './components/layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import OrganizationsPage from './pages/OrganizationsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import NewAssessmentPage from './pages/NewAssessmentPage';
import AssessmentDetailPage from './pages/AssessmentDetailPage';
import ExecutiveReportPage from './pages/ExecutiveReportPage';

const queryClient = new QueryClient();

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="assessments" element={<AssessmentsPage />} />
            <Route path="assessments/new" element={<NewAssessmentPage />} />
            <Route path="assessments/:id" element={<AssessmentDetailPage />} />
            <Route path="assessments/:id/report" element={<ExecutiveReportPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

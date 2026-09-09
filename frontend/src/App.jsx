import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import AuthLayout from './components/layout/AuthLayout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { PageLoader } from './components/ui/Card.jsx';

// Route-level code splitting: the counter only downloads the admin screens
// if it actually opens one.
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));

const StaffDashboard = lazy(() => import('./pages/staff/Dashboard.jsx'));
const CreateReceipt = lazy(() => import('./pages/staff/CreateReceipt.jsx'));
const StaffReceipts = lazy(() => import('./pages/staff/Receipts.jsx'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminReceipts = lazy(() => import('./pages/admin/Receipts.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'));
const AdminTests = lazy(() => import('./pages/admin/Tests.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs.jsx'));

const ReceiptDetails = lazy(() => import('./pages/ReceiptDetails.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

/** Sends a signed-in user to the right home screen. */
function HomeRedirect() {
  return (
    <ProtectedRoute>
      <Navigate to="/staff/dashboard" replace />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>
              <ThemeProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* The site is staff-only, so the root is the sign-in
                        page. PublicOnlyRoute forwards an already signed-in
                        user straight to their dashboard. */}
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    <Route element={<AuthLayout />}>
                      <Route
                        path="/login"
                        element={
                          <PublicOnlyRoute>
                            <Login />
                          </PublicOnlyRoute>
                        }
                      />
                      <Route
                        path="/register"
                        element={
                          <PublicOnlyRoute>
                            <Register />
                          </PublicOnlyRoute>
                        }
                      />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/pending" element={<PendingApproval />} />
                    </Route>

                    {/* signed in */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/staff/dashboard" element={<StaffDashboard />} />
                      <Route path="/staff/receipts" element={<StaffReceipts />} />
                      <Route path="/staff/receipts/create" element={<CreateReceipt />} />
                      <Route path="/staff/receipts/:id" element={<ReceiptDetails />} />
                      <Route path="/profile" element={<Profile />} />
                    </Route>

                    {/* administrators only */}
                    <Route
                      element={
                        <ProtectedRoute requireAdmin>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/receipts" element={<AdminReceipts />} />
                      <Route path="/admin/receipts/:id" element={<ReceiptDetails />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/tests" element={<AdminTests />} />
                      <Route path="/admin/settings" element={<AdminSettings />} />
                      <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    </Route>

                    <Route path="/dashboard" element={<HomeRedirect />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ThemeProvider>
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

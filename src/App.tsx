import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SupabaseStatusProvider } from './contexts/SupabaseStatusContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { PageView } from './pages/PageView';
import { ProjectPage } from './pages/ProjectPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { SpeedInsights } from "@vercel/speed-insights/react"

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#328fce]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isEditor, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#328fce]"></div>
      </div>
    );
  }

  if (!user || (!isAdmin && !isEditor)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function Layout() {
  const location = useLocation();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#328fce]"></div>
      </div>
    );
  }

  const showHeaderFooter = 
    location.pathname !== '/login' && 
    location.pathname !== '/forgot-password' && 
    location.pathname !== '/reset-password' &&
    location.pathname !== '/404';

  return (
    <div className="flex flex-col min-h-screen">
      <SpeedInsights />
      <MaintenanceOverlay />
      {showHeaderFooter && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/politique-de-confidentialite" element={<PrivacyPolicyPage />} />
          <Route path="/projets/:slug" element={<ProjectPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route
            path="/profile"
            element={
              <AuthenticatedRoute>
                <ProfilePage />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/*" element={<PageView />} />
        </Routes>
      </main>
      {showHeaderFooter && <Footer />}
      <CookieBanner />
    </div>
  );
}

function App() {
  const content = (
    <SupabaseStatusProvider>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </SupabaseStatusProvider>
  );

  return (
    <BrowserRouter>
      {import.meta.env.PROD ? (
        <ErrorBoundary>{content}</ErrorBoundary>
      ) : (
        content
      )}
    </BrowserRouter>
  );
}

export default App;

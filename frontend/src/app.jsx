import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function Shell() {
  // Hooks must run unconditionally — do this FIRST
  const { user, loading } = useAuth();
  const path = window.location.pathname;

  // Public route — no auth required
  if (path === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#2563eb' }} />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <DataProvider>
      <DashboardPage />
    </DataProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  );
}
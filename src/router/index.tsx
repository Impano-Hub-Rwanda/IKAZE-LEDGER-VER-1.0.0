import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { useAuth, saveLockedPage } from '../contexts/AuthContext';
import { MainLayout } from '../components/layout/MainLayout';
import { PinLockScreen } from '../components/auth/PinLockScreen';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { SetupPage } from '../features/auth/pages/SetupPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { getAppSettings } from '../lib/exportReport';
import { DashboardSkeleton, PageSkeleton } from '../components/ui/Skeleton';

const CustomersPage = lazy(() => import('../features/customers/pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const ProductsServicesPage = lazy(() => import('../features/products/pages/ProductsServicesPage').then(m => ({ default: m.ProductsServicesPage })));
const InventoryPage = lazy(() => import('../features/inventory/pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const DebtsPage = lazy(() => import('../features/debts/pages/DebtsPage').then(m => ({ default: m.DebtsPage })));
const PaymentsPage = lazy(() => import('../features/payments/pages/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ProFormaInvoicePage = lazy(() => import('../features/proforma/pages/ProFormaInvoicePage').then(m => ({ default: m.ProFormaInvoicePage })));
const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('../features/help/pages/HelpPage').then(m => ({ default: m.HelpPage })));
const DemandLetterPage = lazy(() => import('../features/demand-letter/pages/DemandLetterPage').then(m => ({ default: m.DemandLetterPage })));

function PageFallback() {
  const path = window.location.pathname;
  return path === '/dashboard'
    ? <DashboardSkeleton />
    : <PageSkeleton />;
}

let startupPagePromise: Promise<string> | null = null;

function getStartupPage(): Promise<string> {
  if (!startupPagePromise) {
    startupPagePromise = (async () => {
      try {
        const s = await getAppSettings();
        const valid = ['dashboard', 'customers', 'debts', 'reports', 'payments', 'products', 'inventory', 'proforma', 'settings', 'help', 'demand-letter'];
        return s.startupPage && valid.includes(s.startupPage) ? `/${s.startupPage}` : '/dashboard';
      } catch { return '/dashboard'; }
    })();
  }
  return startupPagePromise;
}

function useStartupPage(): string {
  const [page, setPage] = useState('/dashboard');
  useEffect(() => {
    void getStartupPage().then(setPage);
  }, []);
  return page;
}

function ProtectedRoute() {
  const { session, loading, needsSetup, locked } = useAuth();
  const location = useLocation();

  // When the app locks, save the current path so we can restore it after unlock
  useEffect(() => {
    if (locked && session) {
      saveLockedPage(location.pathname);
    }
  }, [locked, session, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Lock check — this reads from state that is initialized from localStorage,
  // so it survives refresh/restart and cannot be bypassed
  if (locked) {
    return <PinLockScreen />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, needsSetup, locked } = useAuth();
  const startupPage = useStartupPage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  // If the app is locked, always show the lock screen — even on public routes
  if (locked && session) {
    return <PinLockScreen />;
  }

  if (session) {
    return <Navigate to={startupPage} replace />;
  }

  return <>{children}</>;
}

function SetupRoute() {
  const { loading, needsSetup, session } = useAuth();
  const startupPage = useStartupPage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!needsSetup) {
    return <Navigate to={session ? startupPage : '/login'} replace />;
  }

  return <SetupPage />;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/setup" element={<SetupRoute />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected app routes — Dashboard eager, rest lazy-loaded */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<Suspense fallback={<PageFallback />}><CustomersPage /></Suspense>} />
        <Route path="/products" element={<Suspense fallback={<PageFallback />}><ProductsServicesPage /></Suspense>} />
        <Route path="/inventory" element={<Suspense fallback={<PageFallback />}><InventoryPage /></Suspense>} />
        <Route path="/debts" element={<Suspense fallback={<PageFallback />}><DebtsPage /></Suspense>} />
        <Route path="/payments" element={<Suspense fallback={<PageFallback />}><PaymentsPage /></Suspense>} />
        <Route path="/reports" element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>} />
        <Route path="/proforma" element={<Suspense fallback={<PageFallback />}><ProFormaInvoicePage /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
        <Route path="/help" element={<Suspense fallback={<PageFallback />}><HelpPage /></Suspense>} />
        <Route path="/demand-letter" element={<Suspense fallback={<PageFallback />}><DemandLetterPage /></Suspense>} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

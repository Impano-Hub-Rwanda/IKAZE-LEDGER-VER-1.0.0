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
import { PageSkeleton } from '../components/ui/Skeleton';

/* =========================================================
   LAZY LOADED PAGES
   ========================================================= */

const CustomersPage = lazy(() =>
  import('../features/customers/pages/CustomersPage').then((m) => ({
    default: m.CustomersPage,
  }))
);

const ProductsServicesPage = lazy(() =>
  import('../features/products/pages/ProductsServicesPage').then((m) => ({
    default: m.ProductsServicesPage,
  }))
);

const InventoryPage = lazy(() =>
  import('../features/inventory/pages/InventoryPage').then((m) => ({
    default: m.InventoryPage,
  }))
);

const DebtsPage = lazy(() =>
  import('../features/debts/pages/DebtsPage').then((m) => ({
    default: m.DebtsPage,
  }))
);

const PaymentsPage = lazy(() =>
  import('../features/payments/pages/PaymentsPage').then((m) => ({
    default: m.PaymentsPage,
  }))
);

const ReportsPage = lazy(() =>
  import('../features/reports/pages/ReportsPage').then((m) => ({
    default: m.ReportsPage,
  }))
);

const ProFormaInvoicePage = lazy(() =>
  import('../features/proforma/pages/ProFormaInvoicePage').then((m) => ({
    default: m.ProFormaInvoicePage,
  }))
);

const SettingsPage = lazy(() =>
  import('../features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  }))
);

const HelpPage = lazy(() =>
  import('../features/help/pages/HelpPage').then((m) => ({
    default: m.HelpPage,
  }))
);

/* =========================================================
   LOADING FALLBACK
   ========================================================= */

/**
 * Lightweight fallback displayed while a lazy page is loading.
 *
 * Uses the existing Skeleton system instead of a spinner.
 * No database/network/auth logic is executed here.
 */
function PageFallback() {
  return (
    <div
      className="animate-fade-in"
      role="status"
      aria-label="Loading page"
    >
      <PageSkeleton columns={4} rows={6} />
    </div>
  );
}

/* =========================================================
   STARTUP PAGE
   ========================================================= */

function useStartupPage(): string {
  const [page, setPage] = useState('/dashboard');

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const s = await getAppSettings();

        const valid = [
          'dashboard',
          'customers',
          'debts',
          'reports',
          'payments',
          'products',
          'inventory',
          'proforma',
          'settings',
          'help',
        ];

        if (
          active &&
          s.startupPage &&
          valid.includes(s.startupPage)
        ) {
          setPage(`/${s.startupPage}`);
        }
      } catch {
        /*
         * Keep dashboard as the default startup page.
         */
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return page;
}

/* =========================================================
   AUTH LOADING
   ========================================================= */

/**
 * Small and lightweight loading screen used only while
 * authentication state is being initialized.
 */
function AuthLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center
      bg-slate-50 dark:bg-slate-900"
      role="status"
      aria-label="Loading application"
    >
      <div className="w-full max-w-md px-6">
        <div className="animate-fade-in">
          <PageSkeleton columns={2} rows={3} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PROTECTED ROUTE
   ========================================================= */

function ProtectedRoute() {
  const {
    session,
    loading,
    needsSetup,
    locked,
  } = useAuth();

  const location = useLocation();

  /*
   * Save current page while the application is locked.
   * This allows the application to restore the same page
   * after successful PIN unlock.
   */
  useEffect(() => {
    if (locked && session) {
      saveLockedPage(location.pathname);
    }
  }, [locked, session, location.pathname]);

  /*
   * Authentication initialization.
   */
  if (loading) {
    return <AuthLoadingFallback />;
  }

  /*
   * First-time setup.
   */
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  /*
   * No active session.
   */
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  /*
   * Application locked.
   */
  if (locked) {
    return <PinLockScreen />;
  }

  /*
   * Authenticated application.
   */
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

/* =========================================================
   PUBLIC-ONLY ROUTE
   ========================================================= */

function PublicOnlyRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    session,
    loading,
    needsSetup,
    locked,
  } = useAuth();

  const startupPage = useStartupPage();

  /*
   * Authentication initialization.
   */
  if (loading) {
    return <AuthLoadingFallback />;
  }

  /*
   * Setup must happen before normal application access.
   */
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  /*
   * Locked session always takes priority.
   */
  if (locked && session) {
    return <PinLockScreen />;
  }

  /*
   * Already authenticated users go to their configured
   * startup page.
   */
  if (session) {
    return <Navigate to={startupPage} replace />;
  }

  return <>{children}</>;
}

/* =========================================================
   SETUP ROUTE
   ========================================================= */

function SetupRoute() {
  const {
    loading,
    needsSetup,
    session,
  } = useAuth();

  const startupPage = useStartupPage();

  /*
   * Authentication initialization.
   */
  if (loading) {
    return <AuthLoadingFallback />;
  }

  /*
   * Setup already completed.
   */
  if (!needsSetup) {
    return (
      <Navigate
        to={session ? startupPage : '/login'}
        replace
      />
    );
  }

  return <SetupPage />;
}

/* =========================================================
   APP ROUTER
   ========================================================= */

export function AppRouter() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC AUTH ROUTES
          ===================================================== */}

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/setup"
        element={<SetupRoute />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      {/* =====================================================
          PROTECTED APPLICATION ROUTES
          ===================================================== */}

      <Route element={<ProtectedRoute />}>
        {/* Dashboard remains eager-loaded because it is
            normally the first page users see. */}

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/customers"
          element={
            <Suspense fallback={<PageFallback />}>
              <CustomersPage />
            </Suspense>
          }
        />

        <Route
          path="/products"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProductsServicesPage />
            </Suspense>
          }
        />

        <Route
          path="/inventory"
          element={
            <Suspense fallback={<PageFallback />}>
              <InventoryPage />
            </Suspense>
          }
        />

        <Route
          path="/debts"
          element={
            <Suspense fallback={<PageFallback />}>
              <DebtsPage />
            </Suspense>
          }
        />

        <Route
          path="/payments"
          element={
            <Suspense fallback={<PageFallback />}>
              <PaymentsPage />
            </Suspense>
          }
        />

        <Route
          path="/reports"
          element={
            <Suspense fallback={<PageFallback />}>
              <ReportsPage />
            </Suspense>
          }
        />

        <Route
          path="/proforma"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProFormaInvoicePage />
            </Suspense>
          }
        />

        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageFallback />}>
              <SettingsPage />
            </Suspense>
          }
        />

        <Route
          path="/help"
          element={
            <Suspense fallback={<PageFallback />}>
              <HelpPage />
            </Suspense>
          }
        />

        <Route
          path="/change-password"
          element={<ChangePasswordPage />}
        />
      </Route>

      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}

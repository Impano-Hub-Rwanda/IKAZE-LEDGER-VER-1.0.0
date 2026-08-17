import { useState, useEffect } from 'react';
import { Users, Package, CreditCard, Banknote, Wallet, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Spinner } from '../../../components/ui/Spinner';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalDebts: number;
  totalReceived: number;
  remainingBalance: number;
  lowStockCount: number;
}

export function DashboardPage() {
  const { t } = useLanguage();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = getDb();

        // Single query for all dashboard stats — eliminates 5 round-trips
        const res = await db.query<{
          total_customers: number;
          total_products: number;
          total_debts: number;
          total_received: string;
          remaining_balance: string;
          low_stock_count: number;
        }>(
          `SELECT
             (SELECT COUNT(*) FROM customers) AS total_customers,
             (SELECT COUNT(*) FROM products) AS total_products,
             (SELECT COUNT(*) FROM debts WHERE status IN ('pending','partially_paid','overdue')) AS total_debts,
             COALESCE((SELECT SUM(paid_amount) FROM debts), 0)::numeric AS total_received,
             COALESCE((SELECT SUM(total_amount - paid_amount) FROM debts WHERE status IN ('pending','partially_paid','overdue')), 0)::numeric AS remaining_balance,
             (SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_threshold) AS low_stock_count`,
        );

        if (cancelled) return;

        const r = res.rows[0];
        setStats({
          totalCustomers: r?.total_customers ?? 0,
          totalProducts: r?.total_products ?? 0,
          totalDebts: r?.total_debts ?? 0,
          totalReceived: Number(r?.total_received ?? 0),
          remainingBalance: Number(r?.remaining_balance ?? 0),
          lowStockCount: r?.low_stock_count ?? 0,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.dashboard.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const cards = [
    {
      label: t.dashboard.totalCustomers,
      value: String(stats?.totalCustomers ?? 0),
      icon: Users,
      color: 'teal' as const,
    },
    {
      label: t.dashboard.totalProducts,
      value: String(stats?.totalProducts ?? 0),
      icon: Package,
      color: 'green' as const,
    },
    {
      label: t.dashboard.totalDebts,
      value: String(stats?.totalDebts ?? 0),
      icon: CreditCard,
      color: 'teal' as const,
    },
    {
      label: t.dashboard.totalReceived,
      value: formatCurrency(stats?.totalReceived ?? 0),
      icon: Banknote,
      color: 'green' as const,
    },
    {
      label: t.dashboard.remainingBalance,
      value: formatCurrency(stats?.remainingBalance ?? 0),
      icon: Wallet,
      color: 'teal' as const,
    },
    {
      label: t.dashboard.lowStockAlert,
      value: String(stats?.lowStockCount ?? 0),
      hint: t.dashboard.lowStockHint,
      icon: AlertTriangle,
      color: 'yellow' as const,
    },
  ];

  return (
    <div className="animate-page-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">{t.dashboard.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, idx) => (
          <StatCard key={idx} {...card} style={{ animationDelay: `${Math.min(idx * 60, 300)}ms` }} />
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: typeof Users;
  hint?: string;
  color: 'teal' | 'green' | 'yellow';
  style?: React.CSSProperties;
}

const colorStyles = {
  teal: {
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    iconText: 'text-teal-600 dark:text-teal-400',
    valueText: 'text-teal-700 dark:text-teal-300',
    accent: 'border-t-4 border-teal-500',
  },
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconText: 'text-green-600 dark:text-green-400',
    valueText: 'text-green-700 dark:text-green-300',
    accent: 'border-t-4 border-green-500',
  },
  yellow: {
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconText: 'text-yellow-600 dark:text-yellow-400',
    valueText: 'text-yellow-700 dark:text-yellow-300',
    accent: 'border-t-4 border-yellow-500',
  },
};

function StatCard({ label, value, icon: Icon, hint, color, style }: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      className={`animate-row-in rounded-xl border border-slate-200 bg-white p-5 shadow-desk transition-all duration-150 ease-desk hover:shadow-desk-md dark:border-slate-700 dark:bg-slate-800 ${styles.accent}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-bold leading-tight ${styles.valueText}`}>
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
          )}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
          <Icon className={`h-6 w-6 ${styles.iconText}`} />
        </div>
      </div>
    </div>
  );
}

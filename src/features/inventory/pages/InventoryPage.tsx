import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  PackageX,
  Search,
  History,
} from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { EmptyState, IconButton } from '../../../components/ui/Primitives';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { getStockStatus, type Product, type StockStatus, type InventoryMovement, type MovementType } from '../../../types';
import { StockMovementModal } from '../components/StockMovementModal';

type Tab = 'current' | 'history';

export function InventoryPage() {
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('current');

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>('in');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setError('');
    try {
      const db = getDb();
      const [pRes, mRes] = await Promise.all([
        db.query<Product>('SELECT * FROM products ORDER BY name'),
        db.query<InventoryMovement>(
          `SELECT m.*, p.name AS product_name, u.full_name AS user_name
           FROM inventory_movements m
           JOIN products p ON p.id = m.product_id
           LEFT JOIN users u ON u.id = m.user_id
           ORDER BY m.created_at DESC
           LIMIT 100`,
        ),
      ]);
      setProducts(pRes.rows as Product[]);
      setMovements(mRes.rows as InventoryMovement[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let out = 0;
    for (const p of products) {
      const s = getStockStatus(p);
      if (s === 'in') inStock++;
      else if (s === 'low') low++;
      else out++;
    }
    return { total: products.length, inStock, low, out };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.model ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movements;
    return movements.filter(
      (m) =>
        (m.product_name ?? '').toLowerCase().includes(q) ||
        (m.reason ?? '').toLowerCase().includes(q) ||
        (m.user_name ?? '').toLowerCase().includes(q),
    );
  }, [movements, search]);

  const openMovement = (product: Product, type: MovementType) => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-page-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            {t.inventory.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{t.inventory.subtitle}</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Package} label={t.inventory.totalProducts} value={stats.total} color="blue" delay={0} />
        <StatCard icon={ArrowDownCircle} label={t.inventory.inStock} value={stats.inStock} color="green" delay={60} />
        <StatCard icon={AlertTriangle} label={t.inventory.lowStock} value={stats.low} color="yellow" delay={120} />
        <StatCard icon={PackageX} label={t.inventory.outOfStock} value={stats.out} color="red" delay={180} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
        <TabButton active={tab === 'current'} onClick={() => setTab('current')}>
          <Package className="h-4 w-4" />
          {t.inventory.currentStock}
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          <History className="h-4 w-4" />
          {t.inventory.history}
        </TabButton>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'current' ? t.inventory.searchPlaceholder : t.inventory.searchPlaceholder}
          className="input-base pl-11"
        />
      </div>

      {tab === 'current' ? (
        <CurrentStockView
          products={filteredProducts}
          hasSearch={search.trim().length > 0}
          onStockIn={(p) => openMovement(p, 'in')}
          onStockOut={(p) => openMovement(p, 'out')}
        />
      ) : (
        <HistoryView movements={filteredMovements} hasSearch={search.trim().length > 0} />
      )}

      <StockMovementModal
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        onSaved={() => void load(true)}
        product={selectedProduct}
        movementType={movementType}
      />
    </div>
  );
}

function CurrentStockView({
  products,
  hasSearch,
  onStockIn,
  onStockOut,
}: {
  products: Product[];
  hasSearch: boolean;
  onStockIn: (p: Product) => void;
  onStockOut: (p: Product) => void;
}) {
  const { t } = useLanguage();

  if (products.length === 0) {
    return (
      <EmptyState
        hasSearch={hasSearch}
        emptyTitle={t.inventory.title}
        emptyHint={t.inventory.noProducts}
        noResults={t.inventory.noResults}
        addLabel={t.products.add}
        addIcon={Package}
        accentClass="bg-teal-100 dark:bg-teal-900/40"
        onAdd={() => {}}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-desk-sm dark:border-slate-700 dark:bg-slate-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30">
            <tr>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.products.name}
              </th>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.products.sellingPrice}
              </th>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.inventory.currentStock}
              </th>
              <th className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                {t.common.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {products.map((p) => (
              <tr
                key={p.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                      <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-slate-800 dark:text-white">{p.name}</span>
                      {p.model && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{p.model}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-white">
                  {formatCurrency(Number(p.selling_price))}
                </td>
                <td className="px-5 py-3.5">
                  <StockBadge status={getStockStatus(p)} quantity={p.stock_quantity} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      icon={ArrowDownCircle}
                      label={t.inventory.stockIn}
                      onClick={() => onStockIn(p)}
                    />
                    <IconButton
                      icon={ArrowUpCircle}
                      label={t.inventory.stockOut}
                      onClick={() => onStockOut(p)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-white">{p.name}</p>
                {p.model && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.model}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">
                    {formatCurrency(Number(p.selling_price))}
                  </span>
                  <StockBadge status={getStockStatus(p)} quantity={p.stock_quantity} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
              <Button size="sm" variant="success" onClick={() => onStockIn(p)} className="flex-1">
                <span className="flex items-center justify-center gap-1.5">
                  <ArrowDownCircle className="h-4 w-4" /> {t.inventory.stockIn}
                </span>
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onStockOut(p)} className="flex-1">
                <span className="flex items-center justify-center gap-1.5">
                  <ArrowUpCircle className="h-4 w-4" /> {t.inventory.stockOut}
                </span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function HistoryView({
  movements,
  hasSearch,
}: {
  movements: InventoryMovement[];
  hasSearch: boolean;
}) {
  const { t } = useLanguage();

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-600 dark:bg-slate-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
          <History className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-base font-semibold text-slate-800 dark:text-white">
          {hasSearch ? t.inventory.noResults : t.inventory.emptyHistory}
        </p>
        {!hasSearch && (
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {t.inventory.noMovementsHint}
          </p>
        )}
      </div>
    );
  }

  const typeStyles: Record<MovementType, string> = {
    in: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    out: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    adjust: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  };
  const typeLabels: Record<MovementType, string> = {
    in: t.inventory.movementIn,
    out: t.inventory.movementOut,
    adjust: t.inventory.movementAdjust,
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-desk-sm dark:border-slate-700 dark:bg-slate-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30">
            <tr>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.products.name}
              </th>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.inventory.movementType}
              </th>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.inventory.change}
              </th>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.inventory.reason}
              </th>
              <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                {t.inventory.addedOn}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {movements.map((m) => {
              const change = Number(m.quantity_change);
              return (
                <tr
                  key={m.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-white">
                    {m.product_name}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyles[m.movement_type]}`}
                    >
                      {typeLabels[m.movement_type]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold">
                    <span className={change >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                      {change >= 0 ? '+' : ''}{change}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                    {m.reason || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                    {formatDate(m.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {movements.map((m) => {
          const change = Number(m.quantity_change);
          return (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white">{m.product_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(m.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyles[m.movement_type]}`}
                >
                  {typeLabels[m.movement_type]}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {m.reason || '—'}
                </span>
                <span className={`text-sm font-bold ${change >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                  {change >= 0 ? '+' : ''}{change}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const colorStyles = {
  blue: { icon: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40' },
  green: { icon: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  yellow: { icon: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
  red: { icon: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red';
  delay: number;
}) {
  const styles = colorStyles[color];
  return (
    <div
      className="animate-row-in flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}>
        <Icon className={`h-5 w-5 ${styles.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-teal-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function StockBadge({ status, quantity }: { status: StockStatus; quantity: number }) {
  const { t } = useLanguage();
  const styles: Record<StockStatus, string> = {
    in: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    out: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const labels: Record<StockStatus, string> = {
    in: t.products.stockIn,
    low: t.products.stockLow,
    out: t.products.stockOut,
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {quantity} · {labels[status]}
    </span>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PackagePlus, Eye, Pencil, Trash2, Package } from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { PageHeader, SearchBar, EmptyState, IconButton } from '../../../components/ui/Primitives';
import { formatCurrency } from '../../../utils/formatCurrency';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { DeleteProductModal } from '../components/DeleteProductModal';
import { getStockStatus, type Product, type StockStatus } from '../../../types/product';

export function ProductsPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setError('');
    }
    try {
      const db = getDb();
      const result = await db.query<Product>(
        'SELECT * FROM products ORDER BY created_at DESC',
      );
      setProducts(result.rows as Product[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.model ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.unit ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const openAdd = useCallback(() => {
    setSelected(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((p: Product) => {
    setSelected(p);
    setFormOpen(true);
  }, []);

  const openDetails = useCallback((p: Product) => {
    setSelected(p);
    setDetailsOpen(true);
  }, []);

  const openDelete = useCallback((p: Product) => {
    setSelected(p);
    setDeleteOpen(true);
  }, []);

  return (
    <div className="animate-page-in space-y-6">
      {!embedded && (
        <PageHeader
          title={t.products.title}
          subtitle={t.products.subtitle}
          actionLabel={t.products.add}
          actionIcon={PackagePlus}
          onAction={openAdd}
        />
      )}
      {embedded && (
        <div className="flex justify-end">
          <Button onClick={openAdd} size="lg" className="shrink-0">
            <span className="flex items-center gap-2"><PackagePlus className="h-5 w-5" /> {t.products.add}</span>
          </Button>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder={t.products.searchPlaceholder} />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={search.trim().length > 0}
          emptyTitle={t.products.title}
          emptyHint={t.products.emptyHint}
          noResults={t.products.noResults}
          addLabel={t.products.add}
          addIcon={PackagePlus}
          accentClass="bg-green-100 dark:bg-green-900/40"
          onAdd={openAdd}
        />
      ) : (
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
                    Category
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    Unit
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.products.sellingPrice}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.products.stockQuantity}
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((p) => (
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
                          <span className="block font-semibold text-slate-800 dark:text-white">
                            {p.name}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {[p.model, p.sku].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                      {p.category || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                      {p.unit || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(p.selling_price)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StockBadge status={getStockStatus(p)} quantity={p.stock_quantity} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton icon={Eye} label={t.products.details} onClick={() => openDetails(p)} />
                        <IconButton icon={Pencil} label={t.products.edit} onClick={() => openEdit(p)} />
                        <IconButton icon={Trash2} label={t.common.delete} danger onClick={() => openDelete(p)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
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
                    {p.category && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.category}</p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(p.selling_price)}
                    </p>
                  </div>
                  <StockBadge status={getStockStatus(p)} quantity={p.stock_quantity} />
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button size="sm" variant="secondary" onClick={() => openDetails(p)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Eye className="h-4 w-4" /> {t.products.details}
                    </span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(p)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Pencil className="h-4 w-4" /> {t.products.edit}
                    </span>
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => openDelete(p)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          void load(true);
        }}
        editing={selected}
      />
      <ProductDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        product={selected}
      />
      <DeleteProductModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => void load(true)}
        product={selected}
      />
    </div>
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

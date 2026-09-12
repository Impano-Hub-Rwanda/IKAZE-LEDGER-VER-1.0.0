import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserPlus, Eye, Pencil, Trash2, User } from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { PageHeader, SearchBar, EmptyState, IconButton } from '../../../components/ui/Primitives';
import { formatDate } from '../../../utils/formatDate';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { CustomerDetailsModal } from '../components/CustomerDetailsModal';
import { DeleteCustomerModal } from '../components/DeleteCustomerModal';
import type { Customer } from '../../../types/customer';

export function CustomersPage() {
  const { t } = useLanguage();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setError('');
    }
    try {
      const db = getDb();
      const result = await db.query<Customer>(
        'SELECT * FROM customers ORDER BY created_at DESC',
      );
      setCustomers(result.rows as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q),
    );
  }, [customers, search]);

  const openAdd = useCallback(() => {
    setSelected(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((c: Customer) => {
    setSelected(c);
    setFormOpen(true);
  }, []);

  const openDetails = useCallback((c: Customer) => {
    setSelected(c);
    setDetailsOpen(true);
  }, []);

  const openDelete = useCallback((c: Customer) => {
    setSelected(c);
    setDeleteOpen(true);
  }, []);

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        title={t.customers.title}
        subtitle={t.customers.subtitle}
        actionLabel={t.customers.add}
        actionIcon={UserPlus}
        onAction={openAdd}
      />

      <SearchBar value={search} onChange={setSearch} placeholder={t.customers.searchPlaceholder} />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={search.trim().length > 0}
          emptyTitle={t.customers.title}
          emptyHint={t.customers.emptyHint}
          noResults={t.customers.noResults}
          addLabel={t.customers.add}
          addIcon={UserPlus}
          accentClass="bg-teal-100 dark:bg-teal-900/40"
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
                    {t.customers.fullName}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.customers.phone}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.customers.addedOn}
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                          <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {c.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {c.phone || t.customers.noPhone}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton icon={Eye} label={t.customers.details} onClick={() => openDetails(c)} />
                        <IconButton icon={Pencil} label={t.customers.edit} onClick={() => openEdit(c)} />
                        <IconButton icon={Trash2} label={t.common.delete} danger onClick={() => openDelete(c)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                    <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-white">{c.full_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {c.phone || t.customers.noPhone}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button size="sm" variant="secondary" onClick={() => openDetails(c)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Eye className="h-4 w-4" /> {t.customers.details}
                    </span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(c)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Pencil className="h-4 w-4" /> {t.customers.edit}
                    </span>
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => openDelete(c)} className="flex-1">
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

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          void load(true);
        }}
        editing={selected}
      />
      <CustomerDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        customer={selected}
      />
      <DeleteCustomerModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => void load(true)}
        customer={selected}
      />
    </div>
  );
}

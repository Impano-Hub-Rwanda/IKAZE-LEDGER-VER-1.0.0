import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, Eye, Pencil, Trash2, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { PageHeader, SearchBar, EmptyState, IconButton } from '../../../components/ui/Primitives';
import { formatCurrency } from '../../../utils/formatCurrency';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { ServiceDetailsModal } from '../components/ServiceDetailsModal';
import { DeleteServiceModal } from '../components/DeleteServiceModal';
import type { Service, ServiceStatus } from '../../../types/service';

export function ServicesPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Service | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setError('');
    try {
      const db = getDb();
      const result = await db.query<Service>(
        'SELECT * FROM services ORDER BY created_at DESC',
      );
      setServices(result.rows as Service[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [services, search]);

  const openAdd = useCallback(() => {
    setSelected(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((s: Service) => {
    setSelected(s);
    setFormOpen(true);
  }, []);

  const openDetails = useCallback((s: Service) => {
    setSelected(s);
    setDetailsOpen(true);
  }, []);

  const openDelete = useCallback((s: Service) => {
    setSelected(s);
    setDeleteOpen(true);
  }, []);

  return (
    <div className="animate-page-in space-y-6">
      {!embedded && (
        <PageHeader
          title={t.services.title}
          subtitle={t.services.subtitle}
          actionLabel={t.services.add}
          actionIcon={PlusCircle}
          onAction={openAdd}
        />
      )}
      {embedded && (
        <div className="flex justify-end">
          <Button variant="indigo" onClick={openAdd} size="lg" className="shrink-0">
            <span className="flex items-center gap-2"><PlusCircle className="h-5 w-5" /> {t.services.add}</span>
          </Button>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder={t.services.searchPlaceholder} />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={search.trim().length > 0}
          emptyTitle={t.services.title}
          emptyHint={t.services.emptyHint}
          noResults={t.services.noResults}
          addLabel={t.services.add}
          addIcon={PlusCircle}
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
                    {t.services.name}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.services.defaultPrice}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.services.status}
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                          <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="block font-semibold text-slate-800 dark:text-white">{s.name}</span>
                          {s.description && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{s.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(s.default_price)}
                    </td>
                    <td className="px-5 py-3.5">
                      <ServiceStatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton icon={Eye} label={t.services.details} onClick={() => openDetails(s)} />
                        <IconButton icon={Pencil} label={t.services.edit} onClick={() => openEdit(s)} />
                        <IconButton icon={Trash2} label={t.common.delete} danger onClick={() => openDelete(s)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                    <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-white">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.description}</p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(s.default_price)}
                    </p>
                    <div className="mt-1">
                      <ServiceStatusBadge status={s.status} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button size="sm" variant="secondary" onClick={() => openDetails(s)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5"><Eye className="h-4 w-4" /> {t.services.details}</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(s)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5"><Pencil className="h-4 w-4" /> {t.services.edit}</span>
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => openDelete(s)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5"><Trash2 className="h-4 w-4" /></span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ServiceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); void load(true); }}
        editing={selected}
      />
      <ServiceDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        service={selected}
      />
      <DeleteServiceModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => { setDeleteOpen(false); void load(true); }}
        service={selected}
      />
    </div>
  );
}

function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const { t } = useLanguage();
  const styles: Record<ServiceStatus, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };
  const labels: Record<ServiceStatus, string> = {
    active: t.services.statusActive,
    inactive: t.services.statusInactive,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {labels[status]}
    </span>
  );
}

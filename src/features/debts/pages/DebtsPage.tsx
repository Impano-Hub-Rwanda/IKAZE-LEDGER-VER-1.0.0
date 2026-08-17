import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Eye, Pencil, Trash2, CreditCard, Banknote, Printer, Package, Hash } from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { getDb } from '../../../lib/database';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader, SearchBar, EmptyState, IconButton } from '../../../components/ui/Primitives';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { DebtFormModal } from '../components/DebtFormModal';
import { DebtDetailsModal } from '../components/DebtDetailsModal';
import { DeleteDebtModal } from '../components/DeleteDebtModal';
import { PaymentFormModal } from '../../payments/components/PaymentFormModal';
import {
  loadDebtReceiptData, loadPaymentReceiptData,
  printDebtReceipt, printPaymentReceipt, printDeliveryNote,
  type PrintFormat,
} from '../../../lib/printReceipt';
import { getAppSettings } from '../../../lib/exportReport';
import type { Debt, DebtStatus, DebtItem } from '../../../types/debt';

interface DebtWithCustomer extends Debt {
  customer_name: string;
  item_count: number;
}

export function DebtsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [debts, setDebts] = useState<DebtWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selected, setSelected] = useState<Debt | null>(null);
  const [payDebt, setPayDebt] = useState<DebtWithCustomer | null>(null);

  const [printDialogDebt, setPrintDialogDebt] = useState<DebtWithCustomer | null>(null);
  const [printFormat, setPrintFormat] = useState<PrintFormat>('receipt');
  const [printWatermark, setPrintWatermark] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setError('');
    try {
      const db = getDb();
      const res = await db.query<DebtWithCustomer>(
        `SELECT d.*, c.full_name AS customer_name,
                (SELECT COUNT(*) FROM debt_items WHERE debt_id = d.id) AS item_count
         FROM debts d
         JOIN customers c ON c.id = d.customer_id
         ORDER BY d.created_at DESC`,
      );
      setDebts(res.rows as DebtWithCustomer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return debts;
    return debts.filter(
      (d) =>
        d.customer_name.toLowerCase().includes(q) ||
        (d.guarantor ?? '').toLowerCase().includes(q),
    );
  }, [debts, search]);

  const openAdd = useCallback(() => { setSelected(null); setFormOpen(true); }, []);
  const openEdit = useCallback((d: DebtWithCustomer) => { setSelected(d); setFormOpen(true); }, []);

  const openDetails = useCallback(async (d: DebtWithCustomer) => {
    try {
      const db = getDb();
      const res = await db.query<DebtItem>('SELECT * FROM debt_items WHERE debt_id = $1 ORDER BY id', [d.id]);
      setSelected({ ...d, items: res.rows as DebtItem[] });
    } catch { setSelected(d); }
    setDetailsOpen(true);
  }, []);

  const openDelete = useCallback((d: DebtWithCustomer) => { setSelected(d); setDeleteOpen(true); }, []);
  const openPay = useCallback((d: DebtWithCustomer) => { setPayDebt(d); setPayOpen(true); }, []);

  const openPrintDialog = useCallback((d: DebtWithCustomer) => {
    setPrintDialogDebt(d);
    setPrintFormat('receipt');
    setPrintWatermark(false);
  }, []);

  const handlePrintConfirm = useCallback(async () => {
    if (!printDialogDebt) return;
    const data = await loadDebtReceiptData(printDialogDebt.id, user?.full_name ?? '—');
    if (data) printDebtReceipt(data, printFormat, printWatermark);
    setPrintDialogDebt(null);
  }, [printDialogDebt, printFormat, printWatermark, user]);

  const handlePrintDeliveryNote = useCallback(async (d: DebtWithCustomer) => {
    const data = await loadDebtReceiptData(d.id, user?.full_name ?? '—');
    if (data) printDeliveryNote(data, false);
  }, [user]);

  const handlePaymentSaved = useCallback(
    async (paymentId: number) => {
      setPayOpen(false);
      void load(true);
      const settings = await getAppSettings();
      if (!settings.autoPrintPayment) return;
      const labels: Record<string, string> = {
        cash: t.payments.methodCash,
        mobile_money: t.payments.methodMobile,
        bank: t.payments.methodBank,
        other: t.payments.methodOther,
      };
      const data = await loadPaymentReceiptData(paymentId, labels, user?.full_name ?? '—');
      if (data) printPaymentReceipt(data);
    },
    [load, t.payments, user],
  );

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        title={t.debts.title}
        subtitle={t.debts.subtitle}
        actionLabel={t.debts.add}
        actionIcon={Plus}
        onAction={openAdd}
      />

      <SearchBar value={search} onChange={setSearch} placeholder={t.debts.searchPlaceholder} />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={search.trim().length > 0}
          emptyTitle={t.debts.title}
          emptyHint={t.debts.emptyHint}
          noResults={t.debts.noResults}
          addLabel={t.debts.add}
          addIcon={Plus}
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
                  <th className="px-3 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">#</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{t.debts.customer}</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">Receipt #</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{t.debts.total}</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{t.debts.remaining}</th>
                  <th className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">{t.debts.status}</th>
                  <th className="px-4 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((d, idx) => {
                  const remaining = Number(d.total_amount) - Number(d.paid_amount);
                  const receiptNo = `RCP-${String(d.id).padStart(4, '0')}`;
                  return (
                    <tr key={d.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-3 py-3.5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                            <CreditCard className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="min-w-0">
                            <span className="block font-semibold text-slate-800 dark:text-white">{d.customer_name}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(d.created_at)} · {Number(d.item_count)} {t.debts.items.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                          <Hash className="h-3 w-3" />{receiptNo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-white">{formatCurrency(Number(d.total_amount))}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-white">{formatCurrency(remaining)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton icon={Printer} label="Print" onClick={() => openPrintDialog(d)} />
                          <IconButton icon={Package} label="Delivery Note" onClick={() => handlePrintDeliveryNote(d)} />
                          <IconButton icon={Banknote} label={t.debts.recordPayment} onClick={() => openPay(d)} />
                          <IconButton icon={Eye} label={t.debts.details} onClick={() => openDetails(d)} />
                          <IconButton icon={Pencil} label={t.debts.edit} onClick={() => openEdit(d)} />
                          <IconButton icon={Trash2} label={t.common.delete} danger onClick={() => openDelete(d)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((d, idx) => {
              const remaining = Number(d.total_amount) - Number(d.paid_amount);
              const receiptNo = `RCP-${String(d.id).padStart(4, '0')}`;
              return (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-desk-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                      <CreditCard className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">{idx + 1}.</span>
                        <p className="font-semibold text-slate-800 dark:text-white">{d.customer_name}</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(d.created_at)}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(remaining)}</span>
                        <StatusBadge status={d.status} />
                      </div>
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                        <Hash className="h-3 w-3" />{receiptNo}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <Button size="sm" variant="success" onClick={() => openPay(d)} className="flex-1">
                      <span className="flex items-center justify-center gap-1.5"><Banknote className="h-4 w-4" /> Pay</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openDetails(d)} className="flex-1">
                      <span className="flex items-center justify-center gap-1.5"><Eye className="h-4 w-4" /> Details</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openPrintDialog(d)} className="flex-1">
                      <span className="flex items-center justify-center gap-1.5"><Printer className="h-4 w-4" /> Print</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handlePrintDeliveryNote(d)} className="flex-1">
                      <span className="flex items-center justify-center gap-1.5"><Package className="h-4 w-4" /> Delivery</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(d)} className="flex-1">
                      <span className="flex items-center justify-center gap-1.5"><Pencil className="h-4 w-4" /></span>
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openDelete(d)} className="flex-1">
                      <span className="flex items-center justify-center gap-1.5"><Trash2 className="h-4 w-4" /></span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Print Format Dialog */}
      <Modal
        open={printDialogDebt !== null}
        onClose={() => setPrintDialogDebt(null)}
        title="Print Debt Receipt"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose a print format for this debt receipt.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'receipt' as const, label: 'Receipt', hint: 'Thermal 58/80mm' },
              { value: 'a5' as const, label: 'A5', hint: '148 × 210 mm' },
              { value: 'a4' as const, label: 'A4', hint: '210 × 297 mm' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPrintFormat(opt.value)}
                className={`rounded-lg border-2 p-3 text-center transition-colors ${
                  printFormat === opt.value
                    ? 'border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-900/20'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-600'
                }`}
              >
                <p className="text-sm font-bold text-slate-800 dark:text-white">{opt.label}</p>
                <p className="text-xs text-slate-400">{opt.hint}</p>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={printWatermark}
              onChange={(e) => setPrintWatermark(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600"
            />
            Show Company Watermark
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPrintDialogDebt(null)} fullWidth>Cancel</Button>
            <Button onClick={handlePrintConfirm} fullWidth>
              <span className="flex items-center justify-center gap-1.5"><Printer className="h-4 w-4" /> Print</span>
            </Button>
          </div>
        </div>
      </Modal>

      <DebtFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(newDebtId) => {
          setFormOpen(false);
          void load(true);
          if (newDebtId) {
            void (async () => {
              const settings = await getAppSettings();
              if (!settings.autoPrintDebt) return;
              const data = await loadDebtReceiptData(newDebtId, user?.full_name ?? '—');
              if (data) printDebtReceipt(data);
            })();
          }
        }}
        editing={selected}
      />
      <DebtDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} debt={selected} />
      <DeleteDebtModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={() => void load(true)} debt={selected} />
      <PaymentFormModal open={payOpen} onClose={() => setPayOpen(false)} onSaved={handlePaymentSaved} presetDebt={payDebt} />
    </div>
  );
}

function StatusBadge({ status }: { status: DebtStatus }) {
  const { t } = useLanguage();
  const styles: Record<DebtStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    partially_paid: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const labels: Record<DebtStatus, string> = {
    pending: t.debts.statusPending,
    partially_paid: t.debts.statusPartial,
    paid: t.debts.statusPaid,
    overdue: t.debts.statusOverdue,
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Eye, Banknote, Printer } from 'lucide-react';
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
import { PaymentFormModal } from '../components/PaymentFormModal';
import { PaymentDetailsModal } from '../components/PaymentDetailsModal';
import { loadPaymentReceiptData, printPaymentReceipt, type PrintFormat } from '../../../lib/printReceipt';
import { getAppSettings } from '../../../lib/exportReport';
import type { Payment, PaymentMethod } from '../../../types';

interface PaymentRow extends Payment {
  customer_name: string;
  user_name: string | null;
  debt_total: number;
  debt_paid: number;
}

export function PaymentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [printDialogPayment, setPrintDialogPayment] = useState<PaymentRow | null>(null);
  const [printFormat, setPrintFormat] = useState<PrintFormat>('receipt');
  const [printWatermark, setPrintWatermark] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setError('');
    try {
      const db = getDb();
      const res = await db.query<PaymentRow>(
        `SELECT p.*, c.full_name AS customer_name, u.full_name AS user_name,
                d.total_amount AS debt_total, d.paid_amount AS debt_paid
         FROM payments p
         JOIN debts d ON d.id = p.debt_id
         JOIN customers c ON c.id = d.customer_id
         LEFT JOIN users u ON u.id = p.user_id
         ORDER BY p.paid_at DESC, p.created_at DESC
         LIMIT 200`,
      );
      setPayments(res.rows as PaymentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        (p.customer_name ?? '').toLowerCase().includes(q) ||
        (p.note ?? '').toLowerCase().includes(q) ||
        (p.user_name ?? '').toLowerCase().includes(q),
    );
  }, [payments, search]);

  const openAdd = () => setFormOpen(true);

  const openDetails = (p: PaymentRow) => {
    setSelected(p);
    setDetailsOpen(true);
  };

  const printReceipt = useCallback(
    async (paymentId: number, format: PrintFormat = 'receipt', showWatermark = false) => {
      const labels: Record<string, string> = {
        cash: t.payments.methodCash,
        mobile_money: t.payments.methodMobile,
        bank: t.payments.methodBank,
        other: t.payments.methodOther,
      };
      const data = await loadPaymentReceiptData(paymentId, labels, user?.full_name ?? '—');
      if (data) printPaymentReceipt(data, format, showWatermark);
    },
    [t.payments, user],
  );

  const openPrintDialog = useCallback((p: PaymentRow) => {
    setPrintDialogPayment(p);
    setPrintFormat('receipt');
    setPrintWatermark(false);
  }, []);

  const handlePrintConfirm = useCallback(async () => {
    if (!printDialogPayment) return;
    await printReceipt(printDialogPayment.id, printFormat, printWatermark);
    setPrintDialogPayment(null);
  }, [printDialogPayment, printFormat, printWatermark, printReceipt]);

  const methodStyles: Record<PaymentMethod, string> = {
    cash: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    mobile_money: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    bank: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };
  const methodLabels: Record<PaymentMethod, string> = {
    cash: t.payments.methodCash,
    mobile_money: t.payments.methodMobile,
    bank: t.payments.methodBank,
    other: t.payments.methodOther,
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
      <PageHeader
        title={t.payments.title}
        subtitle={t.payments.subtitle}
        actionLabel={t.payments.record}
        actionIcon={Plus}
        onAction={openAdd}
      />

      <SearchBar value={search} onChange={setSearch} placeholder={t.payments.searchPlaceholder} />

      {error && <Alert variant="error">{error}</Alert>}

      {payments.length === 0 ? (
        <EmptyState
          hasSearch={search.trim().length > 0}
          emptyTitle={t.payments.title}
          emptyHint={t.payments.emptyHint}
          noResults={t.payments.noResults}
          addLabel={t.payments.record}
          addIcon={Banknote}
          accentClass="bg-green-100 dark:bg-green-900/40"
          onAdd={openAdd}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasSearch={true}
          emptyTitle={t.payments.title}
          emptyHint={t.payments.emptyHint}
          noResults={t.payments.noResults}
          addLabel={t.payments.record}
          addIcon={Banknote}
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
                    {t.payments.customer}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.payments.amount}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.payments.method}
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {t.payments.paidOn}
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                          <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="block font-semibold text-slate-800 dark:text-white">
                            {p.customer_name}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {t.payments.debt} #{p.debt_id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(Number(p.amount))}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${methodStyles[p.method]}`}
                      >
                        {methodLabels[p.method]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                      {formatDate(p.paid_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton icon={Printer} label={t.receipts.paymentReceipt} onClick={() => openPrintDialog(p)} />
                        <IconButton icon={Eye} label={t.payments.details} onClick={() => openDetails(p)} />
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                    <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-white">{p.customer_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.payments.debt} #{p.debt_id} · {formatDate(p.paid_at)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {formatCurrency(Number(p.amount))}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${methodStyles[p.method]}`}
                      >
                        {methodLabels[p.method]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button size="sm" variant="secondary" onClick={() => openDetails(p)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Eye className="h-4 w-4" /> {t.payments.details}
                    </span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openPrintDialog(p)} className="flex-1">
                    <span className="flex items-center justify-center gap-1.5">
                      <Printer className="h-4 w-4" /> {t.receipts.paymentReceipt}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <PaymentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(paymentId) => {
          setFormOpen(false);
          void load(true);
          void (async () => {
            const settings = await getAppSettings();
            if (settings.autoPrintPayment) void printReceipt(paymentId);
          })();
        }}
      />
      {/* Print Format Dialog */}
      <Modal
        open={printDialogPayment !== null}
        onClose={() => setPrintDialogPayment(null)}
        title="Print Payment Receipt"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose a print format for this payment receipt.
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
            <Button variant="secondary" onClick={() => setPrintDialogPayment(null)} fullWidth>Cancel</Button>
            <Button onClick={handlePrintConfirm} fullWidth>
              <span className="flex items-center justify-center gap-1.5"><Printer className="h-4 w-4" /> Print</span>
            </Button>
          </div>
        </div>
      </Modal>

      <PaymentDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        payment={selected}
      />
    </div>
  );
}

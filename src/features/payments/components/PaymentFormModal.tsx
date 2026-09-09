import { useState, useEffect, type FormEvent } from 'react';
import { Banknote } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { getDb } from '../../../lib/database';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { PaymentMethod, Debt } from '../../../types';

interface DebtOption extends Debt {
  customer_name: string;
}

interface PaymentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the new payment's id when a payment is recorded. */
  onSaved: (paymentId: number) => void;
  /** When provided, the modal is locked to recording a payment for this debt. */
  presetDebt?: DebtOption | null;
}

export function PaymentFormModal({ open, onClose, onSaved, presetDebt }: PaymentFormModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [debts, setDebts] = useState<DebtOption[]>([]);
  const [debtId, setDebtId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const [paidAt, setPaidAt] = useState(today());
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setMethod('cash');
    setNote('');
    setFormError('');
    setPaidAt(today());
    if (presetDebt) {
      setDebtId(String(presetDebt.id));
    } else {
      setDebtId('');
      void loadDebts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetDebt]);

  const loadDebts = async () => {
    setFetching(true);
    try {
      const db = getDb();
      const res = await db.query<DebtOption>(
        `SELECT d.*, c.full_name AS customer_name
         FROM debts d JOIN customers c ON c.id = d.customer_id
         WHERE d.status != 'paid' ORDER BY d.created_at DESC`,
      );
      setDebts(res.rows as DebtOption[]);
    } catch {
      setDebts([]);
    } finally {
      setFetching(false);
    }
  };

  const selectedDebt = presetDebt ?? debts.find((d) => d.id === Number(debtId)) ?? null;
  const remaining = selectedDebt ? Number(selectedDebt.total_amount) - Number(selectedDebt.paid_amount) : 0;
  const amountNum = Number(amount) || 0;
  const isFull = amountNum > 0 && amountNum >= remaining;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetDebt = presetDebt ?? debts.find((d) => d.id === Number(debtId)) ?? null;
    if (!targetDebt) {
      setFormError(t.payments.selectDebt);
      return;
    }
    if (!amountNum || amountNum <= 0 || !Number.isFinite(amountNum)) {
      setFormError(t.payments.invalidAmount);
      return;
    }
    const rem = Number(targetDebt.total_amount) - Number(targetDebt.paid_amount);
    if (amountNum > rem + 0.01) {
      setFormError(t.payments.exceedsRemaining.replace('{n}', formatCurrency(rem)));
      return;
    }

    setLoading(true);
    try {
      const db = getDb();
      await db.query('BEGIN');
      try {
        const payRes = await db.query<{ id: number }>(
          'INSERT INTO payments (debt_id, user_id, amount, method, note, paid_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [targetDebt.id, user?.id ?? 0, amountNum, method, note.trim() || null, paidAt],
        );
        const paymentId = (payRes.rows as { id: number }[])[0].id;
        const updated = await db.query<{ id: number }>(
          `UPDATE debts
           SET paid_amount = paid_amount + $1,
               status = CASE
                 WHEN paid_amount + $1 >= total_amount - 0.01 THEN 'paid'
                 WHEN paid_amount + $1 > 0 THEN 'partially_paid'
                 ELSE 'pending'
               END,
               updated_at = now()
           WHERE id = $2 AND paid_amount + $1 <= total_amount + 0.01
           RETURNING id`,
          [amountNum, targetDebt.id],
        );
        if (!(updated.rows as { id: number }[])[0]) throw new Error('Payment exceeds the current balance');
        await db.query('COMMIT');
        onSaved(paymentId);
        handleClose();
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }
    } catch {
      setFormError(t.payments.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={t.payments.record} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}

        {!presetDebt && (
          <Select
            label={t.payments.selectDebt}
            name="debt"
            value={debtId}
            onChange={(e) => setDebtId(e.target.value)}
            placeholder={fetching ? '…' : t.payments.selectDebtPlaceholder}
            options={debts.map((d) => ({
              value: String(d.id),
              label: `#${d.id} · ${d.customer_name} · ${formatCurrency(Number(d.total_amount) - Number(d.paid_amount))}`,
            }))}
            required
          />
        )}

        {selectedDebt && (
          <div className="flex items-center gap-3 rounded-xl bg-teal-50 p-4 dark:bg-teal-900/30">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600">
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {selectedDebt.customer_name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.payments.remaining}:{' '}
                <span className="font-semibold">{formatCurrency(remaining)}</span>
              </p>
            </div>
          </div>
        )}

        <Input
          label={t.payments.amount}
          name="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          required
        />

        {isFull && (
          <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            {t.payments.fullPayment}
          </div>
        )}
        {!isFull && amountNum > 0 && (
          <div className="rounded-lg bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            {t.payments.partialPayment}
          </div>
        )}

        <Select
          label={t.payments.method}
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          options={[
            { value: 'cash', label: t.payments.methodCash },
            { value: 'mobile_money', label: t.payments.methodMobile },
            { value: 'bank', label: t.payments.methodBank },
            { value: 'other', label: t.payments.methodOther },
          ]}
          required
        />

        <Input
          label={t.payments.paidOn}
          name="paidAt"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          required
        />

        <Input
          label={t.payments.noteOptional}
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} fullWidth disabled={loading}>
            {t.common.cancel}
          </Button>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <Spinner size="sm" /> : t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

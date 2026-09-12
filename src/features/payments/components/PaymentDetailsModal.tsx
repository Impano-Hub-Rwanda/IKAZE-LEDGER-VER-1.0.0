import { Banknote, User, CreditCard, Calendar, FileText, Wallet, TrendingUp } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useLanguage } from '../../../i18n';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import type { Payment, PaymentMethod } from '../../../types';

interface PaymentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export function PaymentDetailsModal({ open, onClose, payment }: PaymentDetailsModalProps) {
  const { t } = useLanguage();
  if (!payment) return null;

  const methodLabels: Record<PaymentMethod, string> = {
    cash: t.payments.methodCash,
    mobile_money: t.payments.methodMobile,
    bank: t.payments.methodBank,
    other: t.payments.methodOther,
  };

  return (
    <Modal open={open} onClose={onClose} title={t.payments.details} size="xl">
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl bg-teal-50 p-4 dark:bg-teal-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600">
            <Banknote className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-slate-800 dark:text-white">
              {formatCurrency(Number(payment.amount))}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">#{payment.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard icon={Wallet} label={t.payments.amount} value={formatCurrency(Number(payment.amount))} />
          <SummaryCard
            icon={TrendingUp}
            label={t.payments.remaining}
            value={formatCurrency(Number(payment.debt_total ?? 0) - Number(payment.debt_paid ?? 0))}
          />
          <SummaryCard icon={CreditCard} label={t.payments.method} value={methodLabels[payment.method]} />
        </div>

        <div className="space-y-3">
          <DetailRow icon={User} label={t.payments.customer} value={payment.customer_name ?? '—'} />
          <DetailRow icon={CreditCard} label={t.payments.debt} value={`#${payment.debt_id}`} />
          <DetailRow icon={Calendar} label={t.payments.paidOn} value={formatDate(payment.paid_at)} />
          <DetailRow icon={Calendar} label={t.payments.addedOn} value={formatDate(payment.created_at)} />
          {payment.user_name && (
            <DetailRow icon={User} label={t.payments.by} value={payment.user_name} />
          )}
          <DetailRow icon={FileText} label={t.payments.note} value={payment.note || '—'} />
        </div>

        <Button type="button" variant="secondary" onClick={onClose} fullWidth>
          {t.common.close}
        </Button>
      </div>
    </Modal>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="mt-1.5 text-base font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="break-words text-sm font-semibold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

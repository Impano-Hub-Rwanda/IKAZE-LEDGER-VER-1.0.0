import { User, Calendar, Shield, FileText, Package, Wrench, TrendingUp, Wallet } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useLanguage } from '../../../i18n';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import type { Debt, DebtStatus, DebtItem } from '../../../types/debt';

interface DebtDetailsModalProps {
  open: boolean;
  onClose: () => void;
  debt: Debt | null;
}

export function DebtDetailsModal({ open, onClose, debt }: DebtDetailsModalProps) {
  const { t } = useLanguage();
  if (!debt) return null;

  const remaining = Number(debt.total_amount) - Number(debt.paid_amount);

  const statusStyles: Record<DebtStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    partially_paid: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const statusLabels: Record<DebtStatus, string> = {
    pending: t.debts.statusPending,
    partially_paid: t.debts.statusPartial,
    paid: t.debts.statusPaid,
    overdue: t.debts.statusOverdue,
  };

  return (
    <Modal open={open} onClose={onClose} title={t.debts.details} size="2xl">
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl bg-teal-50 p-4 dark:bg-teal-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600">
            <User className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-slate-800 dark:text-white">
              {debt.customer_name ?? `#${debt.customer_id}`}
            </p>
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Receipt # RCP-{String(debt.id).padStart(4, '0')}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[debt.status]}`}
          >
            {statusLabels[debt.status]}
          </span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard icon={Wallet} label={t.debts.total} value={formatCurrency(Number(debt.total_amount))} />
          <SummaryCard icon={TrendingUp} label={t.debts.paid} value={formatCurrency(Number(debt.paid_amount))} valueClass="text-green-700 dark:text-green-300" />
          <SummaryCard icon={Wallet} label={t.debts.remaining} value={formatCurrency(remaining)} valueClass="text-teal-700 dark:text-teal-300" />
        </div>

        {/* Items */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
            {t.debts.items}
          </div>
          {debt.items && debt.items.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {debt.items.map((item: DebtItem, idx: number) => {
                const isService = item.item_type === 'service';
                return (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{idx + 1}</span>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isService ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
                      {isService ? <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" /> : <Package className="h-4 w-4 text-green-600 dark:text-green-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isService ? t.debts.serviceLabel : t.debts.productLabel} · {item.quantity} × {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-white">
                    {formatCurrency(Number(item.subtotal))}
                  </span>
                </div>
              );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t.common.noData}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-3">
          <DetailRow icon={Calendar} label={t.debts.dueDate} value={debt.due_date ? formatDate(debt.due_date) : t.debts.noDueDate} />
          <DetailRow icon={Shield} label={t.debts.guarantor} value={debt.guarantor || t.debts.noGuarantor} />
          <DetailRow icon={FileText} label={t.debts.note} value={debt.note || t.debts.noNote} />
          <DetailRow icon={Calendar} label={t.debts.addedOn} value={formatDate(debt.created_at)} />
          <DetailRow icon={Calendar} label={t.debts.updatedOn} value={formatDate(debt.updated_at)} />
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
  valueClass = '',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`mt-1.5 text-base font-bold text-slate-800 dark:text-white ${valueClass}`}>{value}</p>
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

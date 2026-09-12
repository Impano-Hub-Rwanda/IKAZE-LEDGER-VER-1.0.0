import { User, Phone, MapPin, Calendar, Hash } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useLanguage } from '../../../i18n';
import { formatDate } from '../../../utils/formatDate';
import type { Customer } from '../../../types/customer';

interface CustomerDetailsModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerDetailsModal({ open, onClose, customer }: CustomerDetailsModalProps) {
  const { t } = useLanguage();
  if (!customer) return null;

  return (
    <Modal open={open} onClose={onClose} title={t.customers.details}>
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-lg bg-teal-50 p-4 dark:bg-teal-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600">
            <User className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-800 dark:text-white">
              {customer.full_name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              #{customer.id}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <DetailRow icon={Phone} label={t.customers.phone} value={customer.phone || t.customers.noPhone} />
          <DetailRow icon={MapPin} label={t.customers.address} value={customer.address || t.customers.noAddress} />
          {customer.tin_number && (
            <DetailRow icon={Hash} label="TIN Number" value={customer.tin_number} />
          )}
          <DetailRow icon={Calendar} label={t.customers.addedOn} value={formatDate(customer.created_at)} />
          <DetailRow icon={Calendar} label={t.customers.updatedOn} value={formatDate(customer.updated_at)} />
        </div>

        <Button type="button" variant="secondary" onClick={onClose} fullWidth>
          {t.common.close || t.common.cancel}
        </Button>
      </div>
    </Modal>
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

import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useLanguage } from '../../../i18n';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import type { Service } from '../../../types/service';

interface ServiceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  service: Service | null;
}

export function ServiceDetailsModal({ open, onClose, service }: ServiceDetailsModalProps) {
  const { t } = useLanguage();
  if (!service) return null;

  return (
    <Modal open={open} onClose={onClose} title={t.services.details}>
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label={t.services.name} value={service.name} />
            <DetailItem label={t.services.defaultPrice} value={formatCurrency(service.default_price)} />
            <DetailItem label={t.services.status} value={service.status === 'active' ? t.services.statusActive : t.services.statusInactive} />
            <DetailItem label={t.services.addedOn} value={formatDate(service.created_at)} />
            <DetailItem label={t.services.updatedOn} value={formatDate(service.updated_at)} />
          </div>
          {service.description && (
            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.services.description}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{service.description}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>{t.common.close}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

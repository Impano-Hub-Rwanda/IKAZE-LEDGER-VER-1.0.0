import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import type { Service } from '../../../types/service';

interface DeleteServiceModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  service: Service | null;
}

export function DeleteServiceModal({ open, onClose, onDeleted, service }: DeleteServiceModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!service) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      const db = getDb();
      await db.query('DELETE FROM services WHERE id = $1', [service.id]);
      onDeleted();
    } catch {
      setError(t.services.errorDeleting);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.common.delete}>
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{t.services.deleteConfirm}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/30">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{service.name}</p>
          {service.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{service.description}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>{t.common.cancel}</Button>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? <Spinner size="sm" /> : t.common.delete}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

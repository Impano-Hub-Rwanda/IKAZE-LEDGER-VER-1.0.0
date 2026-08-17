import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import type { Product } from '../../../types/product';

interface DeleteProductModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  product: Product | null;
}

export function DeleteProductModal({
  open,
  onClose,
  onDeleted,
  product,
}: DeleteProductModalProps) {
  const { t } = useLanguage();
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!product) return;
    setFormError('');
    setLoading(true);
    try {
      const db = getDb();
      await db.query('DELETE FROM products WHERE id = $1', [product.id]);
      onDeleted();
      handleClose();
    } catch {
      setFormError(t.products.errorDeleting);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t.common.confirmDeleteTitle}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {t.products.deleteConfirm}
        </p>
      </div>

      {formError && (
        <Alert variant="error" className="mt-4">
          {formError}
        </Alert>
      )}

      {product && (
        <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
          {product.name}
          {product.model ? ` · ${product.model}` : ''}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="button" variant="secondary" onClick={handleClose} fullWidth disabled={loading}>
          {t.common.cancel}
        </Button>
        <Button type="button" variant="danger" onClick={handleConfirm} fullWidth disabled={loading}>
          {loading ? <Spinner size="sm" /> : t.common.delete}
        </Button>
      </div>
    </Modal>
  );
}

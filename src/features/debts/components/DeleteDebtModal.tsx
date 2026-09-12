import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { useLanguage } from '../../../i18n';
import { ConfirmDialogBody } from '../../../components/ui/Primitives';
import { getDb } from '../../../lib/database';
import { applyStockChange } from '../../../lib/stockMovement';
import type { Debt } from '../../../types/debt';

interface DeleteDebtModalProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  debt: Debt | null;
}

export function DeleteDebtModal({ open, onClose, onDeleted, debt }: DeleteDebtModalProps) {
  const { t } = useLanguage();
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!debt) return;
    setFormError('');
    setLoading(true);
    try {
      const db = getDb();
      const res = await db.query<{ product_id: number | null; quantity: number }>(
        'SELECT product_id, quantity FROM debt_items WHERE debt_id = $1',
        [debt.id],
      );
      for (const item of res.rows as typeof res.rows) {
        if (item.product_id) {
          await applyStockChange({
            productId: item.product_id,
            userId: null,
            movementType: 'in',
            quantityChange: item.quantity,
            reason: t.inventory.debtRestockReason,
          });
        }
      }
      await db.query('DELETE FROM debts WHERE id = $1', [debt.id]);
      onDeleted();
      handleClose();
    } catch {
      setFormError(t.debts.errorDeleting);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t.common.confirmDeleteTitle}>
      <ConfirmDialogBody
        message={t.debts.deleteConfirm}
        itemName={debt ? `${debt.customer_name ?? `#${debt.customer_id}`} · ${formatCurrencyPreview(debt)}` : ''}
        error={formError}
        loading={loading}
        onCancel={handleClose}
        onConfirm={handleConfirm}
      />
    </Modal>
  );
}

function formatCurrencyPreview(debt: Debt): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(debt.total_amount)) + ' RWF';
}

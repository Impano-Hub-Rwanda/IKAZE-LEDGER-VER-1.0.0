import { useState, useEffect, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { applyStockChange } from '../../../lib/stockMovement';
import type { Product, MovementType } from '../../../types';

interface StockMovementModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
  movementType: MovementType;
}

export function StockMovementModal({
  open,
  onClose,
  onSaved,
  product,
  movementType,
}: StockMovementModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity('');
      setReason('');
      setFormError('');
    }
  }, [open]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  if (!product) return null;

  const qtyNum = Number(quantity) || 0;
  const isIn = movementType === 'in';
  const newLevel = isIn
    ? product.stock_quantity + qtyNum
    : product.stock_quantity - qtyNum;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!qtyNum || qtyNum <= 0 || !Number.isFinite(qtyNum)) {
      setFormError(t.inventory.invalidQuantity);
      return;
    }
    if (!isIn && qtyNum > product.stock_quantity) {
      setFormError(t.inventory.notEnoughStock.replace('{n}', String(product.stock_quantity)));
      return;
    }
    if (!reason.trim()) {
      setFormError(t.inventory.reasonEmpty);
      return;
    }

    setLoading(true);
    try {
      const change = isIn ? qtyNum : -qtyNum;
      await applyStockChange({
        productId: product.id,
        userId: user?.id ?? null,
        movementType,
        quantityChange: change,
        reason: reason.trim(),
      });
      onSaved();
      handleClose();
    } catch {
      setFormError(t.inventory.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  const Icon = isIn ? ArrowDownCircle : ArrowUpCircle;
  const title = isIn ? t.inventory.stockIn : t.inventory.stockOut;

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <Alert variant="error">{formError}</Alert>
        )}

        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-700/50">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              isIn
                ? 'bg-green-100 dark:bg-green-900/40'
                : 'bg-yellow-100 dark:bg-yellow-900/40'
            }`}
          >
            <Icon
              className={`h-6 w-6 ${
                isIn ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800 dark:text-white">{product.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.inventory.currentLevel}: <span className="font-semibold">{product.stock_quantity}</span>
            </p>
          </div>
        </div>

        <Input
          label={t.inventory.quantity}
          name="quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          autoFocus
        />

        <Input
          label={t.inventory.reasonRequired}
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t.inventory.reasonPlaceholder}
          required
        />

        {qtyNum > 0 && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              newLevel < 0
                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
            }`}
          >
            {t.inventory.newLevel}:{' '}
            <span className="font-bold">{newLevel < 0 ? '—' : newLevel}</span>
          </div>
        )}

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

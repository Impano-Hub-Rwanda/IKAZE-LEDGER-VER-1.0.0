import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { validate, required, optional, isNonNegativeNumber } from '../../../utils/validators';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { Service, ServiceInput, ServiceStatus } from '../../../types/service';

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Service | null;
}

export function ServiceFormModal({ open, onClose, onSaved, editing = null }: ServiceFormModalProps) {
  const { t } = useLanguage();
  const isEdit = Boolean(editing);

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [defaultPrice, setDefaultPrice] = useState(editing ? String(editing.default_price) : '');
  const [status, setStatus] = useState<ServiceStatus>(editing?.status ?? 'active');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setDefaultPrice(editing ? String(editing.default_price) : '');
    setStatus(editing?.status ?? 'active');
    setErrors({});
    setFormError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};
    const nameErr = validate(name, required);
    if (nameErr) next.name = nameErr;
    const descErr = validate(description, optional);
    if (descErr) next.description = descErr;
    const priceErr = validate(defaultPrice, isNonNegativeNumber);
    if (priceErr) next.defaultPrice = priceErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;

    const input: ServiceInput = {
      name: name.trim(),
      description: description.trim(),
      default_price: Number(defaultPrice),
      status,
    };

    setLoading(true);
    try {
      const db = getDb();
      if (isEdit && editing) {
        await db.query(
          'UPDATE services SET name = $1, description = $2, default_price = $3, status = $4, updated_at = now() WHERE id = $5',
          [input.name, input.description || null, input.default_price, input.status, editing.id],
        );
      } else {
        await db.query(
          'INSERT INTO services (name, description, default_price, status) VALUES ($1, $2, $3, $4)',
          [input.name, input.description || null, input.default_price, input.status],
        );
      }
      reset();
      onSaved();
    } catch {
      setFormError(t.services.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? t.services.edit : t.services.add}>
      {formError && (
        <Alert variant="error" className="mb-4">{formError}</Alert>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.services.name}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.services.descriptionOptional}
          </label>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-base resize-none"
            placeholder={t.services.description}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
          )}
        </div>
        <Input
          label={t.services.defaultPrice}
          name="defaultPrice"
          type="number"
          min="0"
          step="0.01"
          value={defaultPrice}
          onChange={(e) => setDefaultPrice(e.target.value)}
          error={errors.defaultPrice}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.services.status}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ServiceStatus)}
            className="input-base"
          >
            <option value="active">{t.services.statusActive}</option>
            <option value="inactive">{t.services.statusInactive}</option>
          </select>
        </div>
        {Number(defaultPrice) > 0 && !errors.defaultPrice && (
          <div className="rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            {t.services.defaultPrice}: <span className="font-semibold">{formatCurrency(Number(defaultPrice))}</span>
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

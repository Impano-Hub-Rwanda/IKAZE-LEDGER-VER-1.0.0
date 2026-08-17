import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { validate, required, isPhone, optional } from '../../../utils/validators';
import type { Customer, CustomerInput } from '../../../types/customer';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Customer | null;
}

export function CustomerFormModal({
  open,
  onClose,
  onSaved,
  editing = null,
}: CustomerFormModalProps) {
  const { t } = useLanguage();
  const isEdit = Boolean(editing);

  const [fullName, setFullName] = useState(editing?.full_name ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [tinNumber, setTinNumber] = useState(editing?.tin_number ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setFullName(editing?.full_name ?? '');
    setPhone(editing?.phone ?? '');
    setAddress(editing?.address ?? '');
    setTinNumber(editing?.tin_number ?? '');
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
    const nameErr = validate(fullName, required);
    if (nameErr) next.fullName = nameErr;
    const phoneErr = validate(phone, optional, isPhone);
    if (phoneErr) next.phone = phoneErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;

    const input: CustomerInput = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      tin_number: tinNumber.trim(),
    };

    setLoading(true);
    try {
      const db = getDb();
      if (isEdit && editing) {
        await db.query(
          'UPDATE customers SET full_name = $1, phone = $2, address = $3, tin_number = $4, updated_at = now() WHERE id = $5',
          [input.full_name, input.phone || null, input.address || null, input.tin_number || null, editing.id],
        );
      } else {
        await db.query(
          'INSERT INTO customers (full_name, phone, address, tin_number) VALUES ($1, $2, $3, $4)',
          [input.full_name, input.phone || null, input.address || null, input.tin_number || null],
        );
      }
      reset();
      onSaved();
    } catch {
      setFormError(t.customers.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? t.customers.edit : t.customers.add}
    >
      {formError && (
        <Alert variant="error" className="mb-4">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.customers.fullName}
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          autoFocus
        />

        <Input
          label={t.customers.phone}
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          placeholder="07XX XXX XXX"
        />

        <Input
          label={t.customers.addressOptional}
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={errors.address}
        />

        <Input
          label="TIN Number (Optional)"
          name="tinNumber"
          value={tinNumber}
          onChange={(e) => setTinNumber(e.target.value)}
          placeholder="e.g. 123456789"
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} fullWidth>
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

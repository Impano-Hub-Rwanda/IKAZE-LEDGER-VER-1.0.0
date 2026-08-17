import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { getDb } from '../../../lib/database';
import { validate, required, optional, isNonNegativeNumber, isPositiveInteger } from '../../../utils/validators';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { Product, ProductInput } from '../../../types/product';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Product | null;
}

export function ProductFormModal({
  open,
  onClose,
  onSaved,
  editing = null,
}: ProductFormModalProps) {
  const { t } = useLanguage();
  const isEdit = Boolean(editing);

  const [name, setName] = useState(editing?.name ?? '');
  const [model, setModel] = useState(editing?.model ?? '');
  const [buyingPrice, setBuyingPrice] = useState(editing ? String(editing.buying_price) : '');
  const [sellingPrice, setSellingPrice] = useState(editing ? String(editing.selling_price) : '');
  const [stockQuantity, setStockQuantity] = useState(editing ? String(editing.stock_quantity) : '0');
  const [unit, setUnit] = useState(editing?.unit ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [sku, setSku] = useState(editing?.sku ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName(editing?.name ?? '');
    setModel(editing?.model ?? '');
    setBuyingPrice(editing ? String(editing.buying_price) : '');
    setSellingPrice(editing ? String(editing.selling_price) : '');
    setStockQuantity(editing ? String(editing.stock_quantity) : '0');
    setUnit(editing?.unit ?? '');
    setDescription(editing?.description ?? '');
    setCategory(editing?.category ?? '');
    setSku(editing?.sku ?? '');
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
    const modelErr = validate(model, optional);
    if (modelErr) next.model = modelErr;
    const buyErr = validate(buyingPrice, isNonNegativeNumber);
    if (buyErr) next.buyingPrice = buyErr;
    const sellErr = validate(sellingPrice, isNonNegativeNumber);
    if (sellErr) next.sellingPrice = sellErr;
    const stockErr = validate(stockQuantity, isPositiveInteger);
    if (stockErr) next.stockQuantity = stockErr;

    if (!next.buyingPrice && !next.sellingPrice) {
      const buy = Number(buyingPrice);
      const sell = Number(sellingPrice);
      if (sell < buy) {
        next.sellingPrice = 'Selling price should be at least the buying price';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;

    const input: ProductInput = {
      name: name.trim(),
      model: model.trim(),
      buying_price: Number(buyingPrice),
      selling_price: Number(sellingPrice),
      stock_quantity: Number(stockQuantity),
      unit: unit.trim(),
      description: description.trim(),
      category: category.trim(),
      sku: sku.trim(),
    };

    setLoading(true);
    try {
      const db = getDb();
      if (isEdit && editing) {
        await db.query(
          `UPDATE products SET name = $1, model = $2, buying_price = $3, selling_price = $4,
            stock_quantity = $5, unit = $6, description = $7, category = $8, sku = $9, updated_at = now()
           WHERE id = $10`,
          [input.name, input.model || null, input.buying_price, input.selling_price,
           input.stock_quantity, input.unit || null, input.description || null,
           input.category || null, input.sku || null, editing.id],
        );
      } else {
        await db.query(
          `INSERT INTO products (name, model, buying_price, selling_price, stock_quantity, unit, description, category, sku)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [input.name, input.model || null, input.buying_price, input.selling_price,
           input.stock_quantity, input.unit || null, input.description || null,
           input.category || null, input.sku || null],
        );
      }
      reset();
      onSaved();
    } catch {
      setFormError(t.products.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  const buyNum = Number(buyingPrice) || 0;
  const sellNum = Number(sellingPrice) || 0;
  const profit = sellNum - buyNum;

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? t.products.edit : t.products.add}>
      {formError && (
        <Alert variant="error" className="mb-4">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Basic Info ── */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Basic Information</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t.products.name}
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoFocus
            />
            <Input
              label={t.products.modelOptional}
              name="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              error={errors.model}
            />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief product description"
              rows={2}
              className="input-base"
            />
          </div>
        </div>

        {/* ── Classification ── */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Classification</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Unit</label>
              <input
                type="text"
                list="unit-options"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Select or type"
                className="input-base"
              />
              <datalist id="unit-options">
                <option value="Pcs" />
                <option value="Kg" />
                <option value="Box" />
                <option value="Litre" />
                <option value="Packet" />
                <option value="Meter" />
                <option value="Set" />
                <option value="Roll" />
                <option value="Pair" />
                <option value="Bottle" />
                <option value="Bag" />
                <option value="Dozen" />
                <option value="Carton" />
                <option value="Bundle" />
                <option value="Bar" />
                <option value="Sack" />
                <option value="Piece" />
                <option value="Gram" />
                <option value="Ton" />
                <option value="Hour" />
                <option value="Day" />
              </datalist>
            </div>
            <Input
              label="Category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Electronics"
            />
            <Input
              label="SKU / Code (Optional)"
              name="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. PRD-001"
            />
          </div>
        </div>

        {/* ── Pricing & Stock ── */}
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Pricing &amp; Stock</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={t.products.buyingPrice}
              name="buyingPrice"
              type="number"
              min="0"
              step="0.01"
              value={buyingPrice}
              onChange={(e) => setBuyingPrice(e.target.value)}
              error={errors.buyingPrice}
            />
            <Input
              label={t.products.sellingPrice}
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              error={errors.sellingPrice}
            />
            <Input
              label={t.products.stockQuantity}
              name="stockQuantity"
              type="number"
              min="0"
              step="1"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              error={errors.stockQuantity}
            />
          </div>
          {profit > 0 && !errors.sellingPrice && (
            <div className="mt-3 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
              {t.products.profitPerUnit}: <span className="font-semibold">{formatCurrency(profit)}</span>
            </div>
          )}
        </div>

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

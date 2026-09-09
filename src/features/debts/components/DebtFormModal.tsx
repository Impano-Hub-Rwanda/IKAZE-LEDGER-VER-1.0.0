import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { Plus, Trash2, ShoppingCart, AlertCircle, Package, Wrench } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { getDb } from '../../../lib/database';
import { applyStockChange } from '../../../lib/stockMovement';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { Customer, Product, Service, Debt, DebtLineInput } from '../../../types';

interface DebtFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (newDebtId?: number) => void;
  editing?: Debt | null;
}

interface LineState extends DebtLineInput {
  key: string;
}

let lineSeq = 0;
const nextKey = () => `line-${++lineSeq}`;

export function DebtFormModal({ open, onClose, onSaved, editing = null }: DebtFormModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isEdit = Boolean(editing);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [guarantor, setGuarantor] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineState[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [editItemsLoading, setEditItemsLoading] = useState(false);
  const [editLinesDirty, setEditLinesDirty] = useState(false);
  const [originalQtyByProduct, setOriginalQtyByProduct] = useState<Record<number, number>>({});
  const editLoadSeq = useRef(0);

  const loadOptions = async () => {
    setFetching(true);
    try {
      const db = getDb();
      const pSql = isEdit
        ? 'SELECT * FROM products ORDER BY name'
        : 'SELECT * FROM products WHERE stock_quantity > 0 ORDER BY name';
      const [cRes, pRes, sRes] = await Promise.all([
        db.query<Customer>('SELECT * FROM customers ORDER BY full_name'),
        db.query<Product>(pSql),
        db.query<Service>(isEdit ? 'SELECT * FROM services ORDER BY name' : "SELECT * FROM services WHERE status = 'active' ORDER BY name"),
      ]);
      setCustomers(cRes.rows as Customer[]);
      setProducts(pRes.rows as Product[]);
      setServices(sRes.rows as Service[]);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    setEditLinesDirty(false);
    setOriginalQtyByProduct({});
    setLines([]);

    void loadOptions();
    if (editing) {
      setCustomerId(editing.customer_id);
      setDueDate(editing.due_date ?? '');
      setGuarantor(editing.guarantor ?? '');
      setNote(editing.note ?? '');
      void loadEditingLines(editing.id);
    } else {
      setCustomerId('');
      setDueDate('');
      setGuarantor('');
      setNote('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const loadEditingLines = async (debtId: number) => {
    const loadSeq = ++editLoadSeq.current;
    setEditItemsLoading(true);
    try {
      const db = getDb();
      const res = await db.query<{
        product_id: number | null; service_id: number | null; item_type: string;
        product_name: string; quantity: number; unit_price: number;
      }>(
        `SELECT di.product_id, di.service_id, di.item_type,
                COALESCE(
                  NULLIF(TRIM(di.product_name), ''),
                  NULLIF(TRIM(p.name), ''),
                  NULLIF(TRIM(s.name), ''),
                  CASE
                    WHEN di.item_type = 'service' AND di.service_id IS NOT NULL THEN CONCAT('Service #', di.service_id)
                    WHEN di.product_id IS NOT NULL THEN CONCAT('Product #', di.product_id)
                    ELSE 'Item'
                  END
                ) AS product_name,
                di.quantity, di.unit_price
         FROM debt_items di
         LEFT JOIN products p ON p.id = di.product_id
         LEFT JOIN services s ON s.id = di.service_id
         WHERE di.debt_id = $1
         ORDER BY di.id`,
        [debtId],
      );
      const rows = res.rows as typeof res.rows;

      // Item data must never depend on a secondary stock query. This was the
      // cause of restored debts appearing empty in Edit when the stock lookup
      // failed: the old code only called setLines() after that lookup.
      const origQtyByProduct: Record<number, number> = {};
      rows.forEach((r) => {
        if (r.product_id) {
          origQtyByProduct[r.product_id] = (origQtyByProduct[r.product_id] ?? 0) + Number(r.quantity || 0);
        }
      });
      if (loadSeq !== editLoadSeq.current) return;
      setOriginalQtyByProduct(origQtyByProduct);

      // Show the recovered items immediately, even if live stock cannot be
      // queried. Existing quantities remain valid through the original-qty
      // allowance; stock is filled in below when available.
      setLines(
        rows.map((r) => ({
          key: nextKey(),
          product_id: r.product_id ?? 0,
          service_id: r.service_id ?? null,
          item_type: (r.item_type ?? 'product') as 'product' | 'service',
          product_name: r.product_name,
          quantity: Number(r.quantity),
          unit_price: Number(r.unit_price),
          subtotal: Number(r.quantity) * Number(r.unit_price),
          available_stock: r.product_id ? (origQtyByProduct[r.product_id] ?? 0) : 999,
        })),
      );

      if (rows.length > 0) {
        const productIds = [...new Set(rows.filter((r) => r.product_id).map((r) => r.product_id!))];
        if (productIds.length) {
          try {
            const stockRes = await db.query<{ id: number; stock_quantity: number }>(
              `SELECT id, stock_quantity FROM products WHERE id IN (${productIds.map((_, i) => `$${i + 1}`).join(', ')})`,
              productIds,
            );
            const stockMap = Object.fromEntries(
              (stockRes.rows as typeof stockRes.rows).map((r) => [r.id, Number(r.stock_quantity)]),
            );
            if (loadSeq !== editLoadSeq.current) return;
            setLines((prev) => prev.map((line) => (
              line.item_type === 'product' && line.product_id > 0
                ? { ...line, available_stock: (stockMap[line.product_id] ?? 0) + (origQtyByProduct[line.product_id] ?? 0) }
                : line
            )));
          } catch {
            // Keep the item rows already loaded. Stock is auxiliary data.
          }
        }
      }
    } catch (err) {
      if (loadSeq !== editLoadSeq.current) return;
      setFormError(err instanceof Error ? err.message : 'Failed to load debt items.');
      setLines([]);
    } finally {
      if (loadSeq === editLoadSeq.current) setEditItemsLoading(false);
    }
  };

  const reset = () => {
    editLoadSeq.current += 1;
    setCustomerId('');
    setDueDate('');
    setGuarantor('');
    setNote('');
    setLines([]);
    setOriginalQtyByProduct({});
    setEditLinesDirty(false);
    setErrors({});
    setFormError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

      const addLine = () => {
    setEditLinesDirty(true);
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(),
        product_id: 0,
        service_id: null,
        item_type: 'product',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        subtotal: 0,
        available_stock: 0,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<LineState>) => {
    setEditLinesDirty(true);
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.product_id !== undefined || patch.service_id !== undefined || patch.item_type !== undefined) {
          if (next.item_type === 'product' && next.product_id > 0) {
            const p = products.find((pp) => pp.id === next.product_id);
            if (p) {
              next.product_name = p.name;
              next.unit_price = Number(p.selling_price);
              next.available_stock = Number(p.stock_quantity) + (originalQtyByProduct[p.id] ?? 0);
            }
          } else if (next.item_type === 'service' && next.service_id) {
            const s = services.find((ss) => ss.id === next.service_id);
            if (s) {
              next.product_name = s.name;
              next.unit_price = Number(s.default_price);
              next.available_stock = 999;
            }
          }
        }
        if (patch.quantity !== undefined || patch.unit_price !== undefined || patch.product_id !== undefined || patch.service_id !== undefined) {
          next.subtotal = next.quantity * next.unit_price;
        }
        return next;
      }),
    );
  };

  const removeLine = (key: string) => {
    setEditLinesDirty(true);
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const lineItemsTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.subtotal, 0),
    [lines],
  );

  // Existing debts keep their persisted total until the user changes item
  // lines. This prevents legacy/old records with incomplete item history from
  // being silently rewritten just by opening and saving the form.
  const total = isEdit && editing && !editLinesDirty
    ? Number(editing.total_amount)
    : lineItemsTotal;

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};
    if (!customerId) next.customerId = t.debts.selectCustomer;
    if (lines.length === 0 && (!isEdit || editLinesDirty)) {
      setFormError(t.debts.addAtLeastOne);
      return false;
    }
    let lineError = '';
    const seenItems = new Set<string>();
    for (const l of lines) {
      const itemKey = `${l.item_type}-${l.item_type === 'product' ? l.product_id : l.service_id}`;
      if (l.item_type === 'product' && !l.product_id) {
        lineError = t.debts.noProductSelected;
        break;
      }
      if (l.item_type === 'service' && !l.service_id) {
        lineError = t.debts.noProductSelected;
        break;
      }
      if (seenItems.has(itemKey)) {
        lineError = t.debts.duplicateProduct;
        break;
      }
      seenItems.add(itemKey);
      if (l.quantity <= 0 || !Number.isInteger(l.quantity)) {
        lineError = t.debts.quantity;
        break;
      }
      if (l.item_type === 'product' && l.quantity > l.available_stock) {
        lineError = t.debts.stockExceeded.replace('{n}', String(l.available_stock));
        break;
      }
    }
    if (lineError) {
      setFormError(lineError);
      return false;
    }
    setErrors(next);
    setFormError('');
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) return;

    setLoading(true);
    try {
      const db = getDb();
      const uid = user.id;
      const totalAmount = isEdit && editing && !editLinesDirty
        ? Number(editing.total_amount)
        : lineItemsTotal;
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        setFormError('The debt total must be greater than 0.');
        setLoading(false);
        return;
      }
      await db.query('BEGIN');
      try {

      if (isEdit && editing) {
        const oldRes = await db.query<{ product_id: number | null; item_type: string; quantity: number }>(
          'SELECT product_id, item_type, quantity FROM debt_items WHERE debt_id = $1',
          [editing.id],
        );
        for (const item of oldRes.rows as typeof oldRes.rows) {
          if (item.product_id && (item.item_type ?? 'product') === 'product') {
            await applyStockChange({
              productId: item.product_id,
              userId: uid,
              movementType: 'in',
              quantityChange: item.quantity,
              reason: t.inventory.debtRestockReason,
              manageTransaction: false,
            });
          }
        }
        await db.query('DELETE FROM debt_items WHERE debt_id = $1', [editing.id]);
        // Recompute status against the NEW total (editing items can change
        // total_amount) — leaving the old status as-is could strand a debt
        // showing "Paid" after its total increased past what was paid, or
        // "Pending" after it decreased to fully match what was already paid.
        const paidSoFar = Number(editing.paid_amount);
        const newStatus = paidSoFar >= totalAmount - 0.01 && totalAmount > 0
          ? 'paid'
          : paidSoFar > 0
            ? 'partially_paid'
            : 'pending';
        await db.query(
          'UPDATE debts SET customer_id = $1, total_amount = $2, due_date = $3, guarantor = $4, note = $5, status = $6, updated_at = now() WHERE id = $7',
          [customerId, totalAmount, dueDate || null, guarantor || null, note || null, newStatus, editing.id],
        );
        for (const l of lines) {
          await db.query(
            'INSERT INTO debt_items (debt_id, product_id, service_id, item_type, product_name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [editing.id, l.item_type === 'product' ? l.product_id : null, l.item_type === 'service' ? l.service_id : null, l.item_type, l.product_name, l.quantity, l.unit_price, l.subtotal],
          );
          if (l.item_type === 'product' && l.product_id) {
            await applyStockChange({
              productId: l.product_id,
              userId: uid,
              movementType: 'out',
              quantityChange: -l.quantity,
              reason: t.inventory.debtSaleReason,
              manageTransaction: false,
            });
          }
        }
      } else {
        const debtRes = await db.query<{ id: number }>(
          'INSERT INTO debts (customer_id, user_id, total_amount, paid_amount, due_date, guarantor, status, note) VALUES ($1, $2, $3, 0, $4, $5, $6, $7) RETURNING id',
          [customerId, uid, totalAmount, dueDate || null, guarantor || null, 'pending', note || null],
        );
        const debtId = (debtRes.rows as { id: number }[])[0].id;
        for (const l of lines) {
          await db.query(
            'INSERT INTO debt_items (debt_id, product_id, service_id, item_type, product_name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [debtId, l.item_type === 'product' ? l.product_id : null, l.item_type === 'service' ? l.service_id : null, l.item_type, l.product_name, l.quantity, l.unit_price, l.subtotal],
          );
          if (l.item_type === 'product' && l.product_id) {
            await applyStockChange({
              productId: l.product_id,
              userId: uid,
              movementType: 'out',
              quantityChange: -l.quantity,
              reason: t.inventory.debtSaleReason,
              manageTransaction: false,
            });
          }
        }
        await db.query('COMMIT');
        reset();
        onSaved(debtId);
        return;
      }
      await db.query('COMMIT');
      reset();
      onSaved();
      } catch (err) {
        try { await db.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
        throw err;
      }
    } catch {
      setFormError(t.debts.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  const hasItems = products.length > 0 || services.length > 0 || (isEdit && lines.length > 0);

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? t.debts.edit : t.debts.add} size="2xl">
      {fetching || (isEdit && editItemsLoading) ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <Alert variant="error" className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </Alert>
          )}

          {customers.length === 0 ? (
            <Alert variant="warning">{t.debts.noCustomers}</Alert>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="w-full">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.debts.customer}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                  className={`input-base ${errors.customerId ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                >
                  <option value="">{t.debts.selectCustomerPlaceholder}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerId}</p>
                )}
              </div>
              <Input
                label={t.debts.dueDateOptional}
                name="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          <Input
            label={t.debts.guarantorOptional}
            name="guarantor"
            value={guarantor}
            onChange={(e) => setGuarantor(e.target.value)}
          />

          {/* Item lines — supports Products and Services */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t.debts.products}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addLine}
                disabled={!hasItems}
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  {t.debts.addProduct}
                </span>
              </Button>
            </div>

            {!hasItems ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t.debts.noProductsAvailable}
              </div>
            ) : lines.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                  <ShoppingCart className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.debts.noLinesTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.debts.noLinesHint}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {lines.map((line) => {
                  const currentKey = `${line.item_type}-${line.item_type === 'product' ? line.product_id : line.service_id}`;
                  return (
                    <div key={line.key} className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <select
                            value={currentKey}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '0') {
                                updateLine(line.key, { product_id: 0, service_id: null, item_type: 'product', product_name: '', unit_price: 0, subtotal: 0, available_stock: 0 });
                              } else {
                                const [type, idStr] = val.split('-');
                                const id = Number(idStr);
                                if (type === 'product') {
                                  updateLine(line.key, { product_id: id, service_id: null, item_type: 'product', quantity: 1 });
                                } else {
                                  updateLine(line.key, { product_id: 0, service_id: id, item_type: 'service', quantity: 1 });
                                }
                              }
                            }}
                            className="input-base"
                          >
                            <option value="0">{t.debts.selectProductPlaceholder}</option>
                            {products.length > 0 && (
                              <optgroup label={t.debts.productItems}>
                                {products.map((p) => {
                                  const usedElsewhere = lines.some(
                                    (l2) => l2.key !== line.key && l2.item_type === 'product' && l2.product_id === p.id,
                                  );
                                  return (
                                    <option key={`p-${p.id}`} value={`product-${p.id}`} disabled={usedElsewhere}>
                                      {p.name} · {formatCurrency(Number(p.selling_price))} · {p.stock_quantity} {t.products.units}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            {services.length > 0 && (
                              <optgroup label={t.debts.serviceItems}>
                                {services.map((s) => {
                                  const usedElsewhere = lines.some(
                                    (l2) => l2.key !== line.key && l2.item_type === 'service' && l2.service_id === s.id,
                                  );
                                  return (
                                    <option key={`s-${s.id}`} value={`service-${s.id}`} disabled={usedElsewhere}>
                                      {s.name} · {formatCurrency(Number(s.default_price))}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="mt-1 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          aria-label={t.debts.removeLine}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      {((line.item_type === 'product' && line.product_id > 0) || (line.item_type === 'service' && line.service_id)) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t.debts.quantity}
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.key, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                              className="input-base"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t.debts.unitPrice}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => updateLine(line.key, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                              className="input-base"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                              {t.debts.subtotal}
                            </label>
                            <div className="flex h-[42px] items-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-900 dark:bg-slate-700 dark:text-white">
                              {formatCurrency(line.subtotal)}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                              {line.item_type === 'product' ? t.products.stockQuantity : t.services.title}
                            </label>
                            <div className={`flex h-[42px] items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                              line.item_type === 'product'
                                ? line.quantity > line.available_stock
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                            }`}>
                              {line.item_type === 'product' ? (
                                <><Package className="h-3.5 w-3.5" /> {line.available_stock - line.quantity}</>
                              ) : (
                                <><Wrench className="h-3.5 w-3.5" /> {t.services.title}</>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {lines.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t.debts.total}
                </span>
                <span className="text-lg font-bold text-teal-700 dark:text-teal-300">
                  {formatCurrency(total)}
                </span>
              </div>
            )}
          </div>

          <Input
            label={t.debts.noteOptional}
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} fullWidth disabled={loading}>
              {t.common.cancel}
            </Button>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? <Spinner size="sm" /> : t.common.save}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

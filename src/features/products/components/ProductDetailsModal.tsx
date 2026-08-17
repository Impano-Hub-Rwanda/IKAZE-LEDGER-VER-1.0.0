import { Package, Tag, TrendingUp, Boxes, Calendar, DollarSign, FileText } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useLanguage } from '../../../i18n';
import type { Product } from '../../../types/product';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';

interface ProductDetailsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductDetailsModal({ open, onClose, product }: ProductDetailsModalProps) {
  const { t } = useLanguage();
  if (!product) return null;

  const profit = product.selling_price - product.buying_price;
  const stockValue = product.selling_price * product.stock_quantity;

  return (
    <Modal open={open} onClose={onClose} title={t.products.details}>
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-lg bg-teal-50 p-4 dark:bg-teal-900/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600">
            <Package className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-800 dark:text-white">
              {product.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {product.model || t.products.noModel} · #{product.id}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <DetailRow icon={Tag} label={t.products.model} value={product.model || t.products.noModel} />
          <DetailRow icon={Tag} label="Category" value={product.category || '—'} />
          <DetailRow icon={Tag} label="Unit" value={product.unit || '—'} />
          <DetailRow icon={Tag} label="SKU / Code" value={product.sku || '—'} />
          {product.description && (
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Description</p>
                <p className="break-words text-sm font-semibold text-slate-800 dark:text-white">{product.description}</p>
              </div>
            </div>
          )}
          <DetailRow
            icon={DollarSign}
            label={t.products.buyingPrice}
            value={formatCurrency(product.buying_price)}
          />
          <DetailRow
            icon={DollarSign}
            label={t.products.sellingPrice}
            value={formatCurrency(product.selling_price)}
          />
          <DetailRow
            icon={TrendingUp}
            label={t.products.profitPerUnit}
            value={formatCurrency(profit)}
            valueClass={profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}
          />
          <DetailRow
            icon={Boxes}
            label={t.products.stockQuantity}
            value={`${product.stock_quantity} ${product.stock_quantity === 1 ? t.products.unit : t.products.units}`}
          />
          <DetailRow icon={Calendar} label={t.products.addedOn} value={formatDate(product.created_at)} />
          <DetailRow icon={Calendar} label={t.products.updatedOn} value={formatDate(product.updated_at)} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.products.totalValue}</span>
          <span className="text-base font-bold text-teal-700 dark:text-teal-300">
            {formatCurrency(stockValue)}
          </span>
        </div>

        <Button type="button" variant="secondary" onClick={onClose} fullWidth>
          {t.common.close}
        </Button>
      </div>
    </Modal>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClass = '',
}: {
  icon: typeof Package;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`break-words text-sm font-semibold text-slate-800 dark:text-white ${valueClass}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText, Printer, Sheet, Calendar, User,
} from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { getDb } from '../../../lib/database';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { PageHeader } from '../../../components/ui/Primitives';
import { PrintPreviewModal } from '../../../components/ui/PrintPreviewModal';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import {
  getBusinessInfo, exportReportToPdf, exportReportToExcel, printReport, buildReportHtml,
  getAppSettings,
  type ReportSection, businessContact,
} from '../../../lib/exportReport';
import type { Customer } from '../../../types';

type ReportType =
  | 'customers' | 'debtors' | 'products' | 'stock' | 'payments'
  | 'daily' | 'weekly' | 'monthly' | 'custom' | 'customer_statement';

type StatementFilter = 'full' | 'payments' | 'outstanding' | 'paid';

interface ReportDef {
  key: ReportType;
  needsDateRange: boolean;
  needsCustomer: boolean;
}

const REPORTS: ReportDef[] = [
  { key: 'customers', needsDateRange: false, needsCustomer: false },
  { key: 'debtors', needsDateRange: false, needsCustomer: false },
  { key: 'products', needsDateRange: false, needsCustomer: false },
  { key: 'stock', needsDateRange: false, needsCustomer: false },
  { key: 'payments', needsDateRange: false, needsCustomer: false },
  { key: 'daily', needsDateRange: false, needsCustomer: false },
  { key: 'weekly', needsDateRange: false, needsCustomer: false },
  { key: 'monthly', needsDateRange: false, needsCustomer: false },
  { key: 'custom', needsDateRange: true, needsCustomer: false },
  { key: 'customer_statement', needsDateRange: true, needsCustomer: true },
];

interface ReportResult {
  sections: ReportSection[];
  summary: { label: string; value: string }[];
  subtitle?: string;
  customerInfo?: {
    name: string; address: string;
    openingBalance: string; totalPurchases: string; totalPayments: string; closingBalance: string;
  };
}

const localDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const todayStr = () => localDateKey(new Date());

const padNum = (n: number): string => String(n).padStart(3, '0');

export function ReportsPage() {
  const { t } = useLanguage();
  const tr = t.reports;
  const { user } = useAuth();

  const [reportType, setReportType] = useState<ReportType>('customers');
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [statementFilter, setStatementFilter] = useState<StatementFilter>('full');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showWatermark, setShowWatermark] = useState(false);
  const [paperSize, setPaperSize] = useState<'a4' | 'a5'>('a4');

  const def = useMemo(() => REPORTS.find((r) => r.key === reportType)!, [reportType]);

  useEffect(() => {
    void (async () => {
      const app = await getAppSettings();
      setPaperSize(app.reportPaperSize === 'a5' ? 'a5' : 'a4');
      if (app.defaultReport) {
        const valid = REPORTS.find((r) => r.key === app.defaultReport);
        if (valid) setReportType(valid.key);
      }
    })();
  }, []);

  useEffect(() => {
    if (def.needsCustomer) {
      void (async () => {
        const db = getDb();
        const res = await db.query<Customer>('SELECT * FROM customers ORDER BY full_name');
        setCustomers(res.rows as Customer[]);
      })();
    }
  }, [def.needsCustomer]);

  const titleText = (key: ReportType): string => {
    const map: Record<ReportType, string> = {
      customers: tr.rCustomers,
      debtors: tr.rDebtors,
      products: tr.rProducts,
      stock: tr.rStock,
      payments: tr.rPayments,
      daily: tr.rDaily,
      weekly: tr.rWeekly,
      monthly: tr.rMonthly,
      custom: tr.rCustom,
      customer_statement: tr.rCustomerStatement,
    };
    return map[key];
  };

  const dateRangeFor = (key: ReportType): { start: string; end: string } => {
    const now = new Date();
    if (key === 'daily') {
      const s = localDateKey(now);
      return { start: s, end: s };
    }
    if (key === 'weekly') {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + (day === 0 ? -6 : 0));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: localDateKey(monday), end: localDateKey(sunday) };
    }
    if (key === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: localDateKey(start), end: localDateKey(end) };
    }
    return { start: from, end: to };
  };

  const buildSubtitle = (key: ReportType, start: string, end: string): string => {
    if (key === 'daily') return tr.dailyFor.replace('{date}', formatDate(start));
    if (key === 'weekly') return tr.weeklyRange.replace('{from}', formatDate(start)).replace('{to}', formatDate(end));
    if (key === 'monthly') {
      const monthName = new Date(start).toLocaleDateString('en', { month: 'long', year: 'numeric' });
      return tr.monthlyRange.replace('{month}', monthName);
    }
    if (key === 'custom') return tr.customRange.replace('{from}', formatDate(start)).replace('{to}', formatDate(end));
    if (key === 'customer_statement') return tr.customRange.replace('{from}', formatDate(start)).replace('{to}', formatDate(end));
    return '';
  };

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const db = getDb();
      const { start, end } = dateRangeFor(reportType);
      if (start > end) {
        setError('The start date cannot be after the end date.');
        setLoading(false);
        return;
      }
      let res: ReportResult;

      if (reportType === 'customer_statement') {
        if (!customerId) {
          setError(tr.selectCustomerForStatement);
          setLoading(false);
          return;
        }

        const custRes = await db.query<{ full_name: string; address: string | null }>(
          'SELECT full_name, address FROM customers WHERE id = $1', [customerId],
        );
        const cust = (custRes.rows as typeof custRes.rows)[0];
        if (!cust) {
          setError(tr.noDataCustomer);
          setLoading(false);
          return;
        }

        if (statementFilter === 'payments') {
          const payRes = await db.query<{ id: number; amount: number; method: string; paid_at: string; debt_id: number }>(
            `SELECT p.id, p.amount, p.method, p.paid_at, p.debt_id
             FROM payments p JOIN debts d ON d.id = p.debt_id
             WHERE d.customer_id = $1
             ${statementFilter === 'payments' ? "AND p.paid_at >= $2 AND p.paid_at < ($3::date + INTERVAL '1 day')" : ''}
             ORDER BY p.paid_at ASC`,
            statementFilter === 'payments' ? [customerId, start, end] : [customerId],
          );
          const pays = payRes.rows as typeof payRes.rows;
          const methodLabels: Record<string, string> = {
            cash: t.payments.methodCash, mobile_money: t.payments.methodMobile,
            bank: t.payments.methodBank, other: t.payments.methodOther,
          };
          let runningBal = 0;
          const payRows = pays.map((p, i) => {
            runningBal -= Number(p.amount);
            return {
              no: padNum(i + 1),
              date: formatDate(p.paid_at),
              description: `Payment for Debt #${p.debt_id}`,
              debit: '—',
              credit: formatCurrency(Number(p.amount)),
              balance: formatCurrency(runningBal),
              method: methodLabels[p.method] ?? p.method,
            };
          });
          const totalAmount = pays.reduce((s, p) => s + Number(p.amount), 0);
          res = {
            subtitle: buildSubtitle(reportType, start, end),
            sections: [{
              title: tr.allActivity,
              columns: [
                { header: tr.colNo, dataKey: 'no', align: 'center' },
                { header: tr.colDate, dataKey: 'date' },
                { header: tr.description, dataKey: 'description' },
                { header: tr.colMethod, dataKey: 'method' },
                { header: tr.colAmount, dataKey: 'credit', align: 'right' },
                { header: tr.runningBalance, dataKey: 'balance', align: 'right' },
              ],
              rows: payRows,
              totalLabel: tr.totalPayments,
              totalValue: formatCurrency(totalAmount),
              emptyMessage: tr.noData,
            }],
            summary: [
              { label: tr.totalPayments, value: formatCurrency(totalAmount) },
              { label: tr.summaryCount, value: String(payRows.length) },
            ],
            customerInfo: {
              name: cust.full_name, address: cust.address ?? '—',
              openingBalance: formatCurrency(0),
              totalPurchases: formatCurrency(0),
              totalPayments: formatCurrency(totalAmount),
              closingBalance: formatCurrency(-totalAmount),
            },
          };
        } else {
          // Full statement: combine debts and payments chronologically
          const debtRes = await db.query<{ id: number; total_amount: number; paid_amount: number; status: string; created_at: string; due_date: string | null }>(
            `SELECT d.id, d.total_amount, d.paid_amount, d.status, d.created_at, d.due_date
             FROM debts d
             WHERE d.customer_id = $1
               AND d.created_at < ($2::date + INTERVAL '1 day')
               ${statementFilter === 'outstanding' ? "AND d.status != 'paid'" : ''}
               ${statementFilter === 'paid' ? "AND d.status = 'paid'" : ''}
             ORDER BY d.created_at ASC`,
            [customerId, end],
          );
          const debts = debtRes.rows as typeof debtRes.rows;

          const debtIds = debts.map((d) => d.id);
          let allPayments: { debt_id: number; amount: number; paid_at: string; method: string }[] = [];
          let allItems: { debt_id: number; product_name: string; quantity: number; unit_price: number; subtotal: number }[] = [];
          if (debtIds.length) {
            const payRes = await db.query<{ debt_id: number; amount: number; paid_at: string; method: string }>(
              `SELECT p.debt_id, p.amount, p.paid_at, p.method
               FROM payments p
               WHERE p.debt_id = ANY($1)
                 AND p.paid_at < ($2::date + INTERVAL '1 day')
               ORDER BY p.paid_at ASC`,
              [debtIds, end],
            );
            allPayments = payRes.rows as typeof payRes.rows;

            const itemRes = await db.query<{ debt_id: number; product_name: string; quantity: number; unit_price: number; subtotal: number }>(
              `SELECT di.debt_id,
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
                      di.quantity, di.unit_price, di.subtotal
               FROM debt_items di
               LEFT JOIN products p ON p.id = di.product_id
               LEFT JOIN services s ON s.id = di.service_id
               WHERE di.debt_id = ANY($1)
               ORDER BY di.id ASC`,
              [debtIds],
            );
            allItems = itemRes.rows as typeof itemRes.rows;
          }

          interface LedgerEntry {
            date: string; item: string; description: string;
            quantity: string; unitPrice: string; totalPrice: string;
            debit: number; credit: number; balance: number; showBalance: boolean;
          }
          const ledger: LedgerEntry[] = [];
          let runningBalance = 0;

          const paymentsByDebt = new Map<number, typeof allPayments>();
          allPayments.forEach((p) => {
            const arr = paymentsByDebt.get(p.debt_id) ?? [];
            arr.push(p);
            paymentsByDebt.set(p.debt_id, arr);
          });

          const itemsByDebt = new Map<number, typeof allItems>();
          allItems.forEach((it) => {
            const arr = itemsByDebt.get(it.debt_id) ?? [];
            arr.push(it);
            itemsByDebt.set(it.debt_id, arr);
          });

          interface TimelineEvent { timestamp: string; type: 'debt' | 'payment'; data: unknown }
          const startTs = new Date(`${start}T00:00:00`).getTime();
          const endTs = new Date(`${end}T23:59:59.999`).getTime();
          for (const d of debts) {
            if (new Date(d.created_at).getTime() < startTs) runningBalance += Number(d.total_amount);
          }
          for (const p of allPayments) {
            if (new Date(p.paid_at).getTime() < startTs) runningBalance -= Number(p.amount);
          }

          const timeline: TimelineEvent[] = [];
          debts.forEach((d) => {
            const ts = new Date(d.created_at).getTime();
            if (ts >= startTs && ts <= endTs) timeline.push({ timestamp: d.created_at, type: 'debt', data: d });
          });
          allPayments.forEach((p) => {
            const ts = new Date(p.paid_at).getTime();
            if (ts >= startTs && ts <= endTs) timeline.push({ timestamp: p.paid_at, type: 'payment', data: p });
          });
          timeline.sort((a, b) => {
            const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            return diff || (a.type === 'debt' ? -1 : 1);
          });

          for (const event of timeline) {
            if (event.type === 'debt') {
              const d = event.data as typeof debts[number];
              runningBalance += Number(d.total_amount);
              const items = itemsByDebt.get(d.id) ?? [];
              if (items.length === 0) {
                // No line items recorded for this debt — still show the debt itself.
                ledger.push({
                  date: formatDate(d.created_at),
                  item: `Debt #${d.id}`,
                  description: '—',
                  quantity: '—',
                  unitPrice: '—',
                  totalPrice: '—',
                  debit: Number(d.total_amount),
                  credit: 0,
                  balance: runningBalance,
                  showBalance: true,
                });
              } else {
                items.forEach((it, idx) => {
                  const isLast = idx === items.length - 1;
                  ledger.push({
                    date: formatDate(d.created_at),
                    item: it.product_name,
                    description: '—',
                    quantity: String(it.quantity),
                    unitPrice: formatCurrency(Number(it.unit_price)),
                    totalPrice: formatCurrency(Number(it.subtotal)),
                    // The debt's total debit and running balance land on the
                    // last item row, so a multi-item debt still ends with a
                    // single, correct ledger movement (not counted per item).
                    debit: isLast ? Number(d.total_amount) : 0,
                    credit: 0,
                    balance: runningBalance,
                    showBalance: isLast,
                  });
                });
              }
            } else {
              const p = event.data as typeof allPayments[number];
              runningBalance -= Number(p.amount);
              const methodLabels: Record<string, string> = {
                cash: t.payments.methodCash, mobile_money: t.payments.methodMobile,
                bank: t.payments.methodBank, other: t.payments.methodOther,
              };
              ledger.push({
                date: formatDate(p.paid_at),
                item: '—',
                description: `Payment (${methodLabels[p.method] ?? p.method})`,
                quantity: '—',
                unitPrice: '—',
                totalPrice: '—',
                debit: 0,
                credit: Number(p.amount),
                balance: runningBalance,
                showBalance: true,
              });
            }
          }

          const openingBalance = debts.reduce((sum, d) => {
            return new Date(d.created_at).getTime() < startTs ? sum + Number(d.total_amount) : sum;
          }, 0) - allPayments.reduce((sum, p) => {
            return new Date(p.paid_at).getTime() < startTs ? sum + Number(p.amount) : sum;
          }, 0);
          const totalPurchases = debts.reduce((sum, d) => {
            const ts = new Date(d.created_at).getTime();
            return ts >= startTs && ts <= endTs ? sum + Number(d.total_amount) : sum;
          }, 0);
          const totalPayments = allPayments.reduce((sum, p) => {
            const ts = new Date(p.paid_at).getTime();
            return ts >= startTs && ts <= endTs ? sum + Number(p.amount) : sum;
          }, 0);
          const closingBalance = openingBalance + totalPurchases - totalPayments;

          const rows = ledger.map((e, i) => ({
            no: padNum(i + 1),
            date: e.date,
            item: e.item,
            description: e.description,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            totalPrice: e.totalPrice,
            debit: e.debit > 0 ? formatCurrency(e.debit) : '—',
            credit: e.credit > 0 ? formatCurrency(e.credit) : '—',
            balance: e.showBalance ? formatCurrency(e.balance) : '—',
          }));

          res = {
            subtitle: buildSubtitle(reportType, start, end),
            sections: [{
              title: tr.allActivity,
              columns: [
                { header: tr.colNo, dataKey: 'no', align: 'center' },
                { header: tr.colDate, dataKey: 'date' },
                { header: tr.colProduct, dataKey: 'item' },
                { header: tr.description, dataKey: 'description' },
                { header: tr.colQuantity, dataKey: 'quantity', align: 'center' },
                { header: tr.colUnitPrice, dataKey: 'unitPrice', align: 'right' },
                { header: tr.colTotalPrice, dataKey: 'totalPrice', align: 'right' },
                { header: tr.colDebit, dataKey: 'debit', align: 'right' },
                { header: tr.colCredit, dataKey: 'credit', align: 'right' },
                { header: tr.runningBalance, dataKey: 'balance', align: 'right' },
              ],
              rows,
              totalLabel: tr.closingBalance,
              totalValue: formatCurrency(closingBalance),
              emptyMessage: tr.noData,
            }],
            summary: [
              { label: tr.openingBalance, value: formatCurrency(openingBalance) },
              { label: tr.totalPurchases, value: formatCurrency(totalPurchases) },
              { label: tr.totalPayments, value: formatCurrency(totalPayments) },
              { label: tr.closingBalance, value: formatCurrency(closingBalance) },
            ],
            customerInfo: {
              name: cust.full_name, address: cust.address ?? '—',
              openingBalance: formatCurrency(openingBalance),
              totalPurchases: formatCurrency(totalPurchases),
              totalPayments: formatCurrency(totalPayments),
              closingBalance: formatCurrency(closingBalance),
            },
          };
        }
      } else if (reportType === 'customers') {
        const r = await db.query<{
          id: number;
          full_name: string;
          phone: string | null;
          address: string | null;
          tin_number: string | null;
          debts: number;
        }>(
          `SELECT c.id, c.full_name, c.phone, c.address, c.tin_number,
                  (SELECT COUNT(*) FROM debts d WHERE d.customer_id = c.id) AS debts
           FROM customers c ORDER BY c.full_name`,
        );
        const rows = (r.rows as typeof r.rows).map((x, i) => ({
          no: padNum(i + 1),
          name: x.full_name,
          tinNumber: x.tin_number ?? '—',
          phone: x.phone ?? '—',
          address: x.address ?? '—',
          debts: x.debts,
        }));
        res = {
          sections: [{
            title: tr.rCustomers,
            columns: [
              { header: tr.colNo, dataKey: 'no', align: 'center' },
              { header: tr.colName, dataKey: 'name' },
              { header: 'TIN Number', dataKey: 'tinNumber' },
              { header: tr.colPhone, dataKey: 'phone' },
              { header: tr.colAddress, dataKey: 'address' },
              { header: tr.colCount, dataKey: 'debts', align: 'center' },
            ],
            rows,
            totalLabel: tr.summaryCustomers,
            totalValue: String(rows.length),
            emptyMessage: tr.noData,
          }],
          summary: [{ label: tr.summaryCustomers, value: String(rows.length) }],
        };
      } else if (reportType === 'debtors') {
        const r = await db.query<{ customer_name: string; total_debt: number; paid: number; remaining: number }>(
          `SELECT c.full_name AS customer_name,
                  SUM(d.total_amount) AS total_debt,
                  SUM(d.paid_amount) AS paid,
                  SUM(d.total_amount - d.paid_amount) AS remaining
           FROM debts d JOIN customers c ON c.id = d.customer_id
           WHERE d.status != 'paid'
           GROUP BY c.full_name
           HAVING SUM(d.total_amount - d.paid_amount) > 0
           ORDER BY remaining DESC`,
        );
        const rows = (r.rows as typeof r.rows).map((x, i) => ({
          no: padNum(i + 1),
          customer: x.customer_name,
          totalDebt: formatCurrency(Number(x.total_debt)),
          paid: formatCurrency(Number(x.paid)),
          remaining: formatCurrency(Number(x.remaining)),
        }));
        const totalRemaining = (r.rows as typeof r.rows).reduce((s, x) => s + Number(x.remaining), 0);
        res = {
          sections: [{
            title: tr.rDebtors,
            columns: [
              { header: tr.colNo, dataKey: 'no', align: 'center' },
              { header: tr.colCustomer, dataKey: 'customer' },
              { header: tr.colTotalDebt, dataKey: 'totalDebt', align: 'right' },
              { header: tr.colPaid, dataKey: 'paid', align: 'right' },
              { header: tr.colRemaining, dataKey: 'remaining', align: 'right' },
            ],
            rows,
            totalLabel: tr.summaryRemaining,
            totalValue: formatCurrency(totalRemaining),
            emptyMessage: tr.noData,
          }],
          summary: [
            { label: tr.summaryDebtors, value: String(rows.length) },
            { label: tr.summaryRemaining, value: formatCurrency(totalRemaining) },
          ],
        };
      } else if (reportType === 'products') {
        const r = await db.query<{ id: number; name: string; model: string | null; stock: number; price: number; category: string | null; unit: string | null; sku: string | null; updated_at: string }>(
          `SELECT id, name, model, stock_quantity AS stock, selling_price AS price,
                  category, unit, sku, updated_at
           FROM products ORDER BY name`,
        );
        const rows = (r.rows as typeof r.rows).map((x, i) => ({
          no: padNum(i + 1),
          name: x.name,
          model: x.model ?? '—',
          category: x.category ?? '—',
          unit: x.unit ?? '—',
          stock: x.stock,
          price: formatCurrency(Number(x.price)),
        }));
        res = {
          sections: [{
            title: tr.rProducts,
            columns: [
              { header: tr.colNo, dataKey: 'no', align: 'center' },
              { header: tr.colProduct, dataKey: 'name' },
              { header: tr.colModel, dataKey: 'model' },
              { header: tr.colCategory, dataKey: 'category' },
              { header: tr.colUnit, dataKey: 'unit', align: 'center' },
              { header: tr.colStock, dataKey: 'stock', align: 'center' },
              { header: tr.colSellingPrice, dataKey: 'price', align: 'right' },
            ],
            rows,
            totalLabel: tr.summaryProducts,
            totalValue: String(rows.length),
            emptyMessage: tr.noData,
          }],
          summary: [{ label: tr.summaryProducts, value: String(rows.length) }],
        };
      } else if (reportType === 'stock') {
        const r = await db.query<{ id: number; name: string; stock: number; threshold: number; price: number; unit: string | null; category: string | null; sku: string | null; updated_at: string }>(
          `SELECT id, name, stock_quantity AS stock, low_stock_threshold AS threshold,
                  selling_price AS price, buying_price, unit, category, sku, updated_at
           FROM products ORDER BY name`,
        );
        const rows = (r.rows as typeof r.rows).map((x, i) => {
          const status = x.stock <= 0 ? tr.statusOut : x.stock <= x.threshold ? tr.statusLow : tr.statusIn;
          return {
            no: padNum(i + 1),
            name: x.name,
            category: x.category ?? '—',
            unit: x.unit ?? '—',
            stock: x.stock,
            threshold: x.threshold,
            status,
            value: formatCurrency(Number(x.price) * x.stock),
            updated: formatDate(x.updated_at),
          };
        });
        const stockValue = (r.rows as typeof r.rows).reduce((s, x) => s + Number(x.price) * x.stock, 0);
        const totalUnits = (r.rows as typeof r.rows).reduce((s, x) => s + x.stock, 0);
        const lowCount = (r.rows as typeof r.rows).filter((x) => x.stock > 0 && x.stock <= x.threshold).length;
        const outCount = (r.rows as typeof r.rows).filter((x) => x.stock <= 0).length;
        const inCount = (r.rows as typeof r.rows).filter((x) => x.stock > x.threshold).length;
        res = {
          sections: [{
            title: tr.rStock,
            columns: [
              { header: tr.colNo, dataKey: 'no', align: 'center' },
              { header: tr.colProduct, dataKey: 'name' },
              { header: tr.colCategory, dataKey: 'category' },
              { header: tr.colUnit, dataKey: 'unit', align: 'center' },
              { header: tr.colStock, dataKey: 'stock', align: 'center' },
              { header: tr.colLowThreshold, dataKey: 'threshold', align: 'center' },
              { header: tr.colStatus, dataKey: 'status', align: 'center' },
              { header: tr.colStockValue, dataKey: 'value', align: 'right' },
              { header: tr.colUpdatedDate, dataKey: 'updated', align: 'center' },
            ],
            rows,
            totalLabel: tr.summaryStockValue,
            totalValue: formatCurrency(stockValue),
            emptyMessage: tr.noData,
          }],
          summary: [
            { label: tr.summaryProducts, value: String(rows.length) },
            { label: tr.summaryTotalStockUnits, value: String(totalUnits) },
            { label: tr.summaryStockValue, value: formatCurrency(stockValue) },
            { label: tr.summaryInStockItems, value: String(inCount) },
            { label: tr.summaryLowStockItems, value: String(lowCount) },
            { label: tr.summaryOutStockItems, value: String(outCount) },
          ],
        };
      } else if (reportType === 'payments') {
        const r = await db.query<{ id: number; customer: string; amount: number; method: string; paid_at: string }>(
          `SELECT p.id, c.full_name AS customer, p.amount, p.method, p.paid_at
           FROM payments p
           JOIN debts d ON d.id = p.debt_id
           JOIN customers c ON c.id = d.customer_id
           ORDER BY p.paid_at DESC`,
        );
        const methodLabels: Record<string, string> = {
          cash: t.payments.methodCash, mobile_money: t.payments.methodMobile,
          bank: t.payments.methodBank, other: t.payments.methodOther,
        };
        const rows = (r.rows as typeof r.rows).map((x, i) => ({
          no: padNum(i + 1),
          customer: x.customer,
          amount: formatCurrency(Number(x.amount)),
          method: methodLabels[x.method] ?? x.method,
          date: formatDate(x.paid_at),
        }));
        const totalAmount = (r.rows as typeof r.rows).reduce((s, x) => s + Number(x.amount), 0);
        res = {
          sections: [{
            title: tr.rPayments,
            columns: [
              { header: tr.colNo, dataKey: 'no', align: 'center' },
              { header: tr.colCustomer, dataKey: 'customer' },
              { header: tr.colAmount, dataKey: 'amount', align: 'right' },
              { header: tr.colMethod, dataKey: 'method', align: 'center' },
              { header: tr.colDate, dataKey: 'date', align: 'center' },
            ],
            rows,
            totalLabel: tr.summaryPayments,
            totalValue: formatCurrency(totalAmount),
            emptyMessage: tr.noData,
          }],
          summary: [
            { label: tr.summaryCount, value: String(rows.length) },
            { label: tr.summaryPayments, value: formatCurrency(totalAmount) },
          ],
        };
      } else {
        // Daily / Weekly / Monthly / Custom: ALL business activity
        const endDate = new Date(end);
        endDate.setDate(endDate.getDate() + 1);
        const startTs = start + 'T00:00:00';
        const endTs = localDateKey(endDate) + 'T00:00:00';

        const activityRows: Record<string, string | number>[] = [];
        let totalDebtsAmount = 0;
        let totalPaymentsAmount = 0;
        let itemsSold = 0;
        let servicesSold = 0;

        // Debts
        const debtRes = await db.query<{ id: number; customer_name: string; total_amount: number; created_at: string }>(
          `SELECT d.id, c.full_name AS customer_name, d.total_amount, d.created_at
           FROM debts d JOIN customers c ON c.id = d.customer_id
           WHERE d.created_at >= $1 AND d.created_at < $2
           ORDER BY d.created_at ASC`,
          [startTs, endTs],
        );
        const debts = debtRes.rows as typeof debtRes.rows;

        // Batch fetch all debt_items for these debts — avoids N+1 queries
        const itemNamesByDebt = new Map<number, string[]>();
        if (debts.length > 0) {
          const debtIds = debts.map((d) => d.id);
          const itemsRes = await db.query<{ debt_id: number; item_type: string; quantity: number; product_name: string }>(
            `SELECT di.debt_id, di.item_type, di.quantity,
                    COALESCE(
                      NULLIF(TRIM(di.product_name), ''),
                      NULLIF(TRIM(p.name), ''),
                      NULLIF(TRIM(s.name), ''),
                      CASE
                        WHEN di.item_type = 'service' AND di.service_id IS NOT NULL THEN CONCAT('Service #', di.service_id)
                        WHEN di.product_id IS NOT NULL THEN CONCAT('Product #', di.product_id)
                        ELSE 'Item'
                      END
                    ) AS product_name
             FROM debt_items di
             LEFT JOIN products p ON p.id = di.product_id
             LEFT JOIN services s ON s.id = di.service_id
             WHERE di.debt_id = ANY($1)
             ORDER BY di.debt_id, di.id`,
            [debtIds],
          );
          for (const item of (itemsRes.rows as typeof itemsRes.rows)) {
            if (item.item_type === 'service') servicesSold += Number(item.quantity);
            else itemsSold += Number(item.quantity);
            const names = itemNamesByDebt.get(item.debt_id) ?? [];
            names.push(`${item.product_name} × ${Number(item.quantity)}`);
            itemNamesByDebt.set(item.debt_id, names);
          }
        }

        for (const d of debts) {
          totalDebtsAmount += Number(d.total_amount);
          const itemSummary = (itemNamesByDebt.get(d.id) ?? []).join(', ');
          activityRows.push({
            no: '', date: formatDate(d.created_at), type: tr.activityDebt,
            description: itemSummary ? `Debt #${d.id} — ${itemSummary}` : `Debt #${d.id}`, amount: formatCurrency(Number(d.total_amount)), customer: d.customer_name,
            _ts: new Date(d.created_at).getTime(),
          });
        }

        // Payments
        const payRes = await db.query<{ id: number; customer_name: string; amount: number; method: string; paid_at: string }>(
          `SELECT p.id, c.full_name AS customer_name, p.amount, p.method, p.paid_at
           FROM payments p
           JOIN debts d ON d.id = p.debt_id
           JOIN customers c ON c.id = d.customer_id
           WHERE p.paid_at >= $1 AND p.paid_at < $2
           ORDER BY p.paid_at ASC`,
          [startTs, endTs],
        );
        const methodLabels: Record<string, string> = {
          cash: t.payments.methodCash, mobile_money: t.payments.methodMobile,
          bank: t.payments.methodBank, other: t.payments.methodOther,
        };
        for (const p of (payRes.rows as typeof payRes.rows)) {
          totalPaymentsAmount += Number(p.amount);
          activityRows.push({
            no: '', date: formatDate(p.paid_at), type: tr.activityPayment,
            description: `Payment (${methodLabels[p.method] ?? p.method})`,
            amount: formatCurrency(Number(p.amount)), customer: p.customer_name,
            _ts: new Date(p.paid_at).getTime(),
          });
        }

        // Inventory movements
        const invRes = await db.query<{ id: number; product_name: string; movement_type: string; quantity_change: number; reason: string; created_at: string }>(
          `SELECT im.id, p.name AS product_name, im.movement_type, im.quantity_change, im.reason, im.created_at
           FROM inventory_movements im JOIN products p ON p.id = im.product_id
           WHERE im.created_at >= $1 AND im.created_at < $2
           ORDER BY im.created_at ASC`,
          [startTs, endTs],
        );
        let stockInUnits = 0;
        let stockOutUnits = 0;
        for (const im of (invRes.rows as typeof invRes.rows)) {
          const typeLabel = im.movement_type === 'in' ? tr.activityStockIn
            : im.movement_type === 'out' ? tr.activityStockOut : tr.activityStockAdjust;
          if (im.movement_type === 'in') stockInUnits += Number(im.quantity_change);
          else if (im.movement_type === 'out') stockOutUnits += Math.abs(Number(im.quantity_change));
          activityRows.push({
            no: '', date: formatDate(im.created_at), type: typeLabel,
            description: `${im.product_name} — ${im.reason ?? ''}`.trim(),
            amount: String(Math.abs(Number(im.quantity_change))), customer: '—',
            _ts: new Date(im.created_at).getTime(),
          });
        }

        // Sort all activity by the ACTUAL timestamp (not the formatted display
        // date string) — sorting on formatted text discarded time-of-day and
        // silently fell back to insertion order (debts, then payments, then
        // stock movements) for anything that happened on the same calendar day,
        // instead of true chronological order.
        activityRows.sort((a, b) => Number(a._ts) - Number(b._ts));
        activityRows.forEach((r, i) => { r.no = padNum(i + 1); delete r._ts; });

        // New customers in period
        const custRes = await db.query<{ count: number }>(
          `SELECT COUNT(*) AS count FROM customers WHERE created_at >= $1 AND created_at < $2`,
          [startTs, endTs],
        );
        const newCustomers = Number((custRes.rows as typeof custRes.rows)[0]?.count ?? 0);

        res = {
          subtitle: buildSubtitle(reportType, start, end),
          sections: [{
            title: tr.allActivity,
            columns: [
              { header: tr.colNo, dataKey: 'no', align: 'center' },
              { header: tr.colDate, dataKey: 'date', align: 'center' },
              { header: tr.colActivity, dataKey: 'type', align: 'center' },
              { header: tr.activityDescription, dataKey: 'description' },
              { header: tr.colCustomer, dataKey: 'customer' },
              { header: tr.colAmount, dataKey: 'amount', align: 'right' },
            ],
            rows: activityRows,
            totalLabel: tr.summaryTotalActivity,
            totalValue: String(activityRows.length),
            emptyMessage: tr.noActivities,
          }],
          summary: [
            { label: tr.summaryTotalActivity, value: String(activityRows.length) },
            { label: tr.summaryTotalDebts, value: formatCurrency(totalDebtsAmount) },
            { label: tr.summaryTotalPayments, value: formatCurrency(totalPaymentsAmount) },
            { label: tr.summaryItemsSold, value: String(itemsSold) },
            { label: tr.summaryServicesSold, value: String(servicesSold) },
            { label: tr.summaryTotalStockIn, value: String(stockInUnits) },
            { label: tr.summaryTotalStockOut, value: String(stockOutUnits) },
            { label: tr.summaryNewCustomers, value: String(newCustomers) },
          ],
        };
      }

      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [reportType, from, to, customerId, statementFilter, t, tr]);

  const buildPrintOptions = async () => {
    if (!result) return null;
    const info = await getBusinessInfo();
    const app = await getAppSettings();
    return {
      title: titleText(reportType),
      dateGenerated: new Date().toLocaleString(),
      preparedBy: user?.full_name ?? '—',
      businessName: info.name,
      businessContact: businessContact(info),
      businessInfo: info,
      logoData: info.logoData,
      showWatermark,
      paperSize,
      subtitle: result.subtitle,
      sections: result.sections,
      summary: result.summary,
      customHeader: app.reportHeader ?? undefined,
      customFooter: app.reportFooter ?? undefined,
      customerInfo: result.customerInfo ? {
        name: result.customerInfo.name,
        address: result.customerInfo.address !== '—' ? result.customerInfo.address : undefined,
      } : undefined,
    };
  };

  const handlePrint = async () => {
    const opts = await buildPrintOptions();
    if (opts) printReport(opts);
    setPreviewOpen(false);
  };

  const handlePreview = async () => {
    const opts = await buildPrintOptions();
    if (opts) {
      setPreviewHtml(buildReportHtml(opts));
      setPreviewOpen(true);
    }
  };

  const handlePdf = async () => {
    if (!result) return;
    const info = await getBusinessInfo();
    const app = await getAppSettings();
    await exportReportToPdf(
      {
        title: titleText(reportType),
        dateGenerated: new Date().toLocaleString(),
        preparedBy: user?.full_name ?? '—',
        fileName: `${reportType}-report.pdf`,
        paperSize,
        subtitle: result.subtitle,
        sections: result.sections,
        summary: result.summary,
        showWatermark,
        customHeader: app.reportHeader ?? undefined,
        customFooter: app.reportFooter ?? undefined,
        customerInfo: result.customerInfo ? {
          name: result.customerInfo.name,
          address: result.customerInfo.address !== '—' ? result.customerInfo.address : undefined,
        } : undefined,
      },
      info,
    );
    setPreviewOpen(false);
  };

  const handleExcel = async () => {
    if (!result) return;
    const section = result.sections[0];
    await exportReportToExcel(
      titleText(reportType),
      section.columns,
      section.rows,
      section.totalLabel ?? '',
      section.totalValue ?? '',
      `${reportType}-report.xlsx`,
    );
  };

  const reportOptions = REPORTS.map((r) => ({ value: r.key, label: titleText(r.key) }));
  const statementFilterOptions = [
    { value: 'full', label: tr.statementFilterFull },
    { value: 'payments', label: tr.statementFilterPayments },
    { value: 'outstanding', label: tr.statementFilterOutstanding },
    { value: 'paid', label: tr.statementFilterPaid },
  ];

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        title={tr.title}
        subtitle={tr.subtitle}
        actionLabel={tr.generate}
        actionIcon={FileText}
        onAction={generate}
      />

      <div className="card-base p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label={tr.selectType}
            name="reportType"
            value={reportType}
            onChange={(e) => { setReportType(e.target.value as ReportType); setResult(null); }}
            options={reportOptions}
          />
          {def.needsCustomer ? (
            <Select
              label={tr.selectCustomerForStatement}
              name="customer"
              value={String(customerId)}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
              options={[{ value: '', label: '—' }, ...customers.map((c) => ({ value: String(c.id), label: c.full_name }))]}
            />
          ) : def.needsDateRange ? (
            <>
              <Input label={tr.from} name="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label={tr.to} name="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          ) : (
            <div className="flex items-end">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                <Calendar className="h-4 w-4" />
                <span>{titleText(reportType)}</span>
              </div>
            </div>
          )}
        </div>

        {def.needsCustomer && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label={tr.statementFilterFull}
              name="statementFilter"
              value={statementFilter}
              onChange={(e) => setStatementFilter(e.target.value as StatementFilter)}
              options={statementFilterOptions}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input label={tr.from} name="stmtFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label={tr.to} name="stmtTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600"
              />
              {t.proforma.showWatermark}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">{tr.paperSize}</span>
              <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">
                {(['a4', 'a5'] as const).map((ps) => (
                  <button
                    key={ps}
                    onClick={() => setPaperSize(ps)}
                    className={`rounded-md px-3 py-1 text-xs font-medium uppercase transition-colors ${
                      paperSize === ps
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {ps}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button variant="violet" onClick={generate} disabled={loading} size="lg">
            <span className="flex items-center gap-2">
              {loading ? <Spinner size="sm" /> : <FileText className="h-5 w-5" />}
              {tr.generate}
            </span>
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {result && (
        <div className="space-y-5">
          {result.customerInfo && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-900/20">
              <div className="flex items-center gap-2 border-b border-teal-200 pb-3 dark:border-teal-800">
                <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300">{tr.customerInfo}</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-400">{tr.colName}</p>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{result.customerInfo.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-400">{tr.colAddress}</p>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{result.customerInfo.address}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-400">{tr.openingBalance}</p>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{result.customerInfo.openingBalance}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-400">{tr.totalPurchases}</p>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{result.customerInfo.totalPurchases}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-400">{tr.totalPayments}</p>
                  <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{result.customerInfo.totalPayments}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-teal-700 dark:text-teal-400">{tr.closingBalance}</p>
                  <p className="text-base font-bold text-teal-900 dark:text-teal-200">{result.customerInfo.closingBalance}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {result.summary.map((s, i) => (
              <div
                key={s.label}
                className="card-base p-2.5"
                style={{ animation: `fade-up 0.4s ease ${i * 60}ms both` }}
              >
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-0.5 text-base font-bold text-slate-800 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{titleText(reportType)}</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handlePreview}>
                <span className="flex items-center gap-1.5"><Printer className="h-4 w-4" /> {tr.printPreview}</span>
              </Button>
              <Button variant="success" size="sm" onClick={handleExcel}>
                <span className="flex items-center gap-1.5"><Sheet className="h-4 w-4" /> {tr.exportExcel}</span>
              </Button>
            </div>
          </div>

          {result.sections.map((section, si) => (
            <div key={si}>
              <h3 className="mb-2 text-sm font-bold text-teal-700 dark:text-teal-400">{section.title}</h3>
              {section.rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-600 dark:bg-slate-800">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">{section.emptyMessage ?? tr.noData}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-desk-sm dark:border-slate-700 dark:bg-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30">
                      <tr>
                        {section.columns.map((c) => (
                          <th key={c.dataKey} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {c.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {section.rows.map((row, i) => (
                        <tr key={i} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          {section.columns.map((c) => (
                            <td key={c.dataKey} className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {String(row[c.dataKey] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {section.totalLabel && section.totalValue && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30">
                          <td colSpan={section.columns.length - 1} className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">
                            {section.totalLabel}
                          </td>
                          <td className="px-4 py-3 font-bold text-teal-600 dark:text-teal-400">{section.totalValue}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-600 dark:bg-slate-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
            <FileText className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-base font-semibold text-slate-800 dark:text-white">{tr.selectReport}</p>
        </div>
      )}

      <PrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewHtml={previewHtml}
        onPrint={handlePrint}
        onDownloadPdf={handlePdf}
        title={`${titleText(reportType)} — ${paperSize.toUpperCase()}`}
      />
    </div>
  );
}
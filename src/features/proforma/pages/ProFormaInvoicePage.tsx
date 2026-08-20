import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  FileDown,
  Plus,
  Trash2,
  X,
  Search,
  Save,
  CheckCircle,
  Copy,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { getDb } from '../../../lib/database';
import {
  getBusinessInfo,
  getAppSettings,
  type BusinessInfo,
} from '../../../lib/exportReport';
import {
  printHtmlDocument,
  saveFileDialog,
  writeFile,
  isTauri,
} from '../../../lib/tauri';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { PageHeader } from '../../../components/ui/Primitives';
import { PrintPreviewModal } from '../../../components/ui/PrintPreviewModal';


import {
  buildPrintHeader,
  buildPrintFooter,
  buildDocTitleBlock,
  resizeLogoForPdf,
  PRINT_BASE_STYLES,
  BRAND_TEAL,
  BRAND_TEAL_DARK,
  BRAND_TEAL_LIGHT,
} from '../../../lib/printLayout';

import type { Customer, Product } from '../../../types';
import type { Service } from '../../../types/service';
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}
type ItemType = 'product' | 'service';

interface LineItem {
  id: number;

  /*
   * IMPORTANT:
   * A product uses productId.
   * A service uses serviceId.
   *
   * We intentionally keep both fields because the existing
   * database already supports both.
   */
  productId: number | '';
  serviceId: number | '';
  itemType: ItemType;

  productName: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SavedProforma {
  id: number;
  invoice_no: string;
  customer_id: number | null;
  customer_name: string;
  quotation_date: string | null;
  status: 'draft' | 'completed';
  subtotal: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  items?: SavedProformaItem[];
}

interface SavedProformaItem {
  id: number;
  proforma_id: number;

  product_id: number | null;
  service_id: number | null;
  item_type: ItemType;

  product_name: string;
  description: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

let lineIdCounter = 1;

const createEmptyLineItem = (): LineItem => ({
  id: lineIdCounter++,
  productId: '',
  serviceId: '',
  itemType: 'product',
  productName: '',
  description: '',
  unit: '',
  quantity: 1,
  unitPrice: 0,
  total: 0,
});

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function ProFormaInvoicePage() {
  const { t } = useLanguage();
  const tp = t.proforma;
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bizInfo, setBizInfo] = useState<BusinessInfo | null>(null);
  const [taxRate, setTaxRate] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');

  const [customerId, setCustomerId] = useState<number | ''>('');
  const [quotationDate, setQuotationDate] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    createEmptyLineItem(),
  ]);

  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] =
    useState<'fixed' | 'percent'>('fixed');

  const [enableTax, setEnableTax] = useState(false);
  const [showWatermark, setShowWatermark] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const [terms, setTerms] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const [savedProformas, setSavedProformas] = useState<SavedProforma[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const [savedFilter, setSavedFilter] =
    useState<'all' | 'draft' | 'completed'>('all');

  const [savedSearch, setSavedSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  /*
   * ------------------------------------------------------------
   * LOAD SAVED PROFORMAS
   * ------------------------------------------------------------
   */

  const loadSavedProformas = useCallback(async () => {
    const db = getDb();

    const res = await db.query<SavedProforma>(
      `SELECT
        id,
        invoice_no,
        customer_id,
        customer_name,
        quotation_date,
        status,
        subtotal,
        grand_total,
        created_at,
        updated_at
       FROM proforma_invoices
       ORDER BY created_at DESC`,
    );

    setSavedProformas(res.rows as SavedProforma[]);
    setLoadingSaved(false);
  }, []);

  /*
   * ------------------------------------------------------------
   * INITIAL LOAD
   * ------------------------------------------------------------
   */

  useEffect(() => {
    void (async () => {
      const db = getDb();

      const [custRes, prodRes, svcRes, info, app] = await Promise.all([
        db.query<Customer>(
          'SELECT * FROM customers ORDER BY full_name',
        ),

        db.query<Product>(
          'SELECT * FROM products ORDER BY name',
        ),

        db.query<Service>(
          `SELECT *
           FROM services
           WHERE status = 'active'
           ORDER BY name`,
        ),

        getBusinessInfo(),
        getAppSettings(),
      ]);

      setCustomers(custRes.rows as Customer[]);
      setProducts(prodRes.rows as Product[]);
      setServices(svcRes.rows as Service[]);
      setBizInfo(info);
      setTaxRate(app.taxRate);

      await loadSavedProformas();
    })();
  }, [loadSavedProformas]);

  /*
   * ------------------------------------------------------------
   * GENERATE PROFORMA NUMBER
   * ------------------------------------------------------------
   */

  const generateInvoiceNo = useCallback(async (): Promise<string> => {
    const db = getDb();

    const res = await db.query<{ invoice_no: string | null }>(
      `SELECT invoice_no
       FROM proforma_invoices
       ORDER BY id DESC
       LIMIT 1`,
    );

    const lastNo = (
      res.rows[0] as { invoice_no?: string } | undefined
    )?.invoice_no;

    if (lastNo) {
      const num = parseInt(lastNo.replace('PF-', ''), 10);

      return `PF-${String(
        Number.isNaN(num) ? 1 : num + 1,
      ).padStart(4, '0')}`;
    }

    return 'PF-0001';
  }, []);

  useEffect(() => {
    if (!editingId) {
      void generateInvoiceNo().then(setInvoiceNo);
    }
  }, [editingId, generateInvoiceNo]);

  /*
   * ------------------------------------------------------------
   * CUSTOMER
   * ------------------------------------------------------------
   */

  const selectedCustomer = useMemo(
    () =>
      customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  /*
   * ------------------------------------------------------------
   * SEARCHABLE PRODUCTS + SERVICES
   * ------------------------------------------------------------
   */

  type SearchableItem = {
    id: number;
    name: string;
    description: string | null;
    category: string | null;
    sku: string | null;
    unit: string | null;
    selling_price: string | number;
    stock_quantity?: string | number;
    low_stock_threshold?: string | number;
    itemType: ItemType;
  };

  const searchableItems = useMemo<SearchableItem[]>(() => {
    const prods: SearchableItem[] = products.map((p) => ({
      ...p,
      itemType: 'product',
      category: p.category ?? null,
      sku: p.sku ?? null,
      unit: p.unit ?? null,
      description: p.description ?? null,
    }));

    const svcs: SearchableItem[] = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      category: null,
      sku: null,
      unit: null,
      selling_price: s.default_price,
      itemType: 'service',
    }));

    return [...prods, ...svcs];
  }, [products, services]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();

    if (!q) return searchableItems;

    return searchableItems.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.unit ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    );
  }, [searchableItems, productSearch]);

  /*
   * ------------------------------------------------------------
   * SAVED FILTER
   * ------------------------------------------------------------
   */

  const filteredSaved = useMemo(() => {
    let list = savedProformas;

    if (savedFilter !== 'all') {
      list = list.filter(
        (p) => p.status === savedFilter,
      );
    }

    const q = savedSearch.toLowerCase().trim();

    if (q) {
      list = list.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(q) ||
          p.invoice_no.toLowerCase().includes(q),
      );
    }

    return list;
  }, [
    savedProformas,
    savedFilter,
    savedSearch,
  ]);

  /*
   * ------------------------------------------------------------
   * CALCULATIONS
   * ------------------------------------------------------------
   */

  const subtotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + Number(item.total || 0),
        0,
      ),
    [lineItems],
  );

  const discountAmount = useMemo(
    () =>
      discountType === 'percent'
        ? subtotal * (discount / 100)
        : discount,
    [subtotal, discount, discountType],
  );

  const afterDiscount = subtotal - discountAmount;

  const taxAmount = enableTax
    ? afterDiscount * (taxRate / 100)
    : 0;

  const grandTotal = afterDiscount + taxAmount;

  /*
   * ------------------------------------------------------------
   * UPDATE LINE ITEM
   * ------------------------------------------------------------
   */

  const updateLineItem = useCallback(
    (
      id: number,
      field: keyof LineItem,
      value: string | number,
    ) => {
      setLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updated = {
            ...item,
            [field]: value,
          };

          if (
            field === 'quantity' ||
            field === 'unitPrice'
          ) {
            updated.total =
              Number(updated.quantity || 0) *
              Number(updated.unitPrice || 0);
          }

          return updated;
        }),
      );
    },
    [],
  );

  /*
   * ------------------------------------------------------------
   * SELECT PRODUCT OR SERVICE
   *
   * THIS IS THE MAIN FIX.
   *
   * Product:
   *   productId = id
   *   serviceId = null
   *   itemType  = product
   *
   * Service:
   *   productId = null
   *   serviceId = id
   *   itemType  = service
   * ------------------------------------------------------------
   */

  const selectProduct = useCallback(
    (rowId: number, item: SearchableItem) => {
      setLineItems((prev) =>
        prev.map((line) => {
          if (line.id !== rowId) return line;

          const isService = item.itemType === 'service';
          const price = Number(item.selling_price || 0);

          return {
            ...line,

            productId: isService ? '' : item.id,

            serviceId: isService ? item.id : '',

            itemType: isService
              ? 'service'
              : 'product',

            productName: item.name,

            description: item.description || '',

            unit:
              item.unit ||
              (isService ? 'service' : ''),

            unitPrice: price,

            total:
              Number(line.quantity || 0) * price,
          };
        }),
      );

      setProductSearch('');
      setActiveRowId(null);
    },
    [],
  );

  /*
   * ------------------------------------------------------------
   * ADD LINE
   * ------------------------------------------------------------
   */

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      createEmptyLineItem(),
    ]);
  }, []);

  /*
   * ------------------------------------------------------------
   * REMOVE LINE
   * ------------------------------------------------------------
   */

  const removeLineItem = useCallback(
    (id: number) => {
      setLineItems((prev) =>
        prev.length > 1
          ? prev.filter((item) => item.id !== id)
          : prev,
      );
    },
    [],
  );

  /*
   * ------------------------------------------------------------
   * OPEN SEARCH
   * ------------------------------------------------------------
   */

  const openProductSearch = useCallback(
    (rowId: number) => {
      setActiveRowId(rowId);
      setProductSearch('');

      setTimeout(() => {
        searchRef.current?.focus();
      }, 50);
    },
    [],
  );

  /*
   * ------------------------------------------------------------
   * CLEAR SELECTED PRODUCT/SERVICE
   *
   * Important: clear BOTH IDs.
   * ------------------------------------------------------------
   */

  const clearSelectedItem = useCallback(
    (rowId: number) => {
      setLineItems((prev) =>
        prev.map((item) => {
          if (item.id !== rowId) return item;

          return {
            ...item,
            productId: '',
            serviceId: '',
            itemType: 'product',
            productName: '',
            description: '',
            unit: '',
            unitPrice: 0,
            total: 0,
          };
        }),
      );
    },
    [],
  );

  /*
   * ------------------------------------------------------------
   * BUILD PRINT HTML
   * ------------------------------------------------------------
   */

  const buildInvoiceHtml = useCallback((): string => {
    if (!bizInfo) return '';

    const headerHtml = buildPrintHeader({
      businessInfo: bizInfo,
      documentTitle: tp.proformaInvoice,
      documentNo: invoiceNo,
    });

    const titleBlockHtml = buildDocTitleBlock(
      tp.proformaInvoice,
      invoiceNo,
    );

    const footerHtml = buildPrintFooter({
      businessInfo: bizInfo,
      confidentialLabel: tp.confidential,
      pageLabel: tp.pageOf
        .replace('{a}', '1')
        .replace('{b}', '1'),
      poweredBy: 'Powered by MUD Software Company',
    });

    const itemsHtml = lineItems
      .filter((item) => item.productName)
      .map(
        (item, index) => `
          <tr>
            <td class="c" style="width:5%">
              ${index + 1}
            </td>

            <td style="width:22%">
              <strong>${esc(item.productName)}</strong>
              ${
                item.itemType === 'service'
                  ? `<div style="font-size:8px;color:#2563eb;font-weight:bold">SERVICE</div>`
                  : ''
              }
            </td>

            <td style="width:28%">
              ${esc(item.description || '')}
            </td>

            <td class="c" style="width:9%">
              ${esc(item.unit || '—')}
            </td>

            <td class="c" style="width:8%">
              ${item.quantity}
            </td>

            <td class="r" style="width:14%">
              ${formatCurrency(item.unitPrice)}
            </td>

            <td class="r" style="width:14%">
              ${formatCurrency(item.total)}
            </td>
          </tr>
        `,
      )
      .join('');

    const watermarkHtml = showWatermark
      ? `<div class="watermark">${esc(
          bizInfo.name,
        )}</div>`
      : '';

    const signatureHtml = showSignature
      ? `
        <div class="pi-sign">
          <div class="pi-sign-block">
            <div class="pi-sign-line">&nbsp;</div>
            <div class="pi-sign-name">
              ${esc(user?.full_name || '—')}
            </div>
            <div class="pi-sign-role">
              ${esc(tp.preparedBy)}
            </div>
          </div>

          <div class="pi-sign-block">
            <div class="pi-sign-line">&nbsp;</div>
            <div class="pi-sign-name">&nbsp;</div>
            <div class="pi-sign-role">
              ${esc(tp.customerReceived)}
            </div>
          </div>
        </div>
      `
      : '';

    const dateRowHtml = quotationDate
      ? `
        <tr>
          <td class="dlbl">
            ${esc(tp.quotationDate)}:
          </td>

          <td class="dval">
            ${esc(formatDate(quotationDate))}
          </td>
        </tr>
      `
      : '';

    return `
      <!doctype html>

      <html>
        <head>
          <meta charset="utf-8">

          <title>
            ${esc(tp.title)} ${esc(invoiceNo)}
          </title>

          <style>
            ${PRINT_BASE_STYLES}

            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform:
                translate(-50%,-50%)
                rotate(-30deg);

              font-size: 90px;
              font-weight: bold;
              color: #000;
              opacity: 0.06;
              white-space: nowrap;
              pointer-events: none;
              z-index: 0;
              letter-spacing: 4px;
            }

            .content {
              position: relative;
              z-index: 1;
            }

            .pi-meta {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin: 6px 0 8px;
              border: 1px solid ${BRAND_TEAL};
              border-radius: 6px;
              padding: 8px 12px;
              background: ${BRAND_TEAL_LIGHT};
            }

            table.doc-table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 10px;
            }

            table.doc-table th {
              border: 1px solid #2563eb;
              padding: 5px 4px;
              font-weight: bold;
              background: #dbeafe;
              color: #1e40af;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              font-size: 9px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            table.doc-table th.l {
              text-align: left;
            }

            table.doc-table td {
              border: 1px solid #cbd5e1;
              padding: 4px;
              vertical-align: top;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            table.doc-table td.c {
              text-align: center;
            }

            table.doc-table td.r {
              text-align: right;
            }

            table.doc-table tbody tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            table.doc-table tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            .pi-client td {
              padding: 2px 4px 2px 0;
              font-size: 10px;
              vertical-align: top;
            }

            .pi-client td.lbl {
              font-weight: bold;
              white-space: nowrap;
              width: 90px;
              color: ${BRAND_TEAL_DARK};
            }

            .pi-dates {
              text-align: right;
            }

            .pi-dates table td {
              padding: 2px 0 2px 10px;
              font-size: 10px;
            }

            .pi-dates table td.dlbl {
              font-weight: bold;
              text-align: right;
              white-space: nowrap;
              color: ${BRAND_TEAL_DARK};
            }

            .pi-dates table td.dval {
              text-align: right;
            }

            .pi-totals {
              margin-top: 8px;
              margin-left: auto;
              width: 280px;
              border: 1px solid #2563eb;
              border-radius: 6px;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .pi-totals table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            .pi-totals table td {
              padding: 6px 10px;
              border-bottom: 1px solid #ddd;
            }

            .pi-totals table td.tv {
              text-align: right;
              font-weight: 600;
            }

            .pi-totals .grand td {
              font-size: 14px;
              font-weight: bold;
              border-top: 3px solid #f59e0b;
              border-bottom: none;
              color: #1e40af;
              background: #eff6ff;
            }

            .pi-notes {
              margin-top: 12px;
            }

            .pi-notes h4 {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
              color: ${BRAND_TEAL_DARK};
            }

            .pi-notes p {
              font-size: 9px;
              color: #555;
              white-space: pre-wrap;
              line-height: 1.6;
            }

            .pi-sign {
              margin-top: 30px;
              display: flex;
              justify-content: space-around;
              gap: 16px;
            }

            .pi-sign-block {
              flex: 1;
              text-align: center;
            }

            .pi-sign-line {
              border-top: 1px solid #333;
              margin-top: 32px;
              padding-top: 3px;
            }

            .pi-sign-name {
              font-size: 10px;
              font-weight: bold;
              margin-top: 2px;
            }

            .pi-sign-role {
              font-size: 8px;
              color: #666;
              margin-top: 1px;
            }

            @media print {
              body {
                background: #fff;
              }

              .page {
                margin: 0;
              }

              .watermark {
                position: fixed;
              }
            }
          </style>
        </head>

        <body>

          ${watermarkHtml}

          <div class="page">

            <div class="content">

              ${headerHtml}

              ${titleBlockHtml}

              <div class="pi-meta">

                <table class="pi-client">

                  <tr>
                    <td class="lbl">
                      ${esc(tp.customer)}:
                    </td>

                    <td>
                      <strong>
                        ${esc(
                          selectedCustomer?.full_name || '—',
                        )}
                      </strong>
                    </td>
                  </tr>

                  ${
                    selectedCustomer?.phone
                      ? `
                        <tr>
                          <td class="lbl">
                            ${esc(tp.phone)}:
                          </td>

                          <td>
                            ${esc(selectedCustomer.phone)}
                          </td>
                        </tr>
                      `
                      : ''
                  }

                  ${
                    selectedCustomer?.tin_number
                      ? `
                        <tr>
                          <td class="lbl">
                            ${esc(tp.customerTin)}:
                          </td>

                          <td>
                            ${esc(
                              selectedCustomer.tin_number,
                            )}
                          </td>
                        </tr>
                      `
                      : ''
                  }

                  ${
                    selectedCustomer?.address
                      ? `
                        <tr>
                          <td class="lbl">
                            Address:
                          </td>

                          <td>
                            ${esc(
                              selectedCustomer.address,
                            )}
                          </td>
                        </tr>
                      `
                      : ''
                  }

                </table>

                <div class="pi-dates">

                  <table>
                    ${dateRowHtml}
                  </table>

                </div>

              </div>

              <table class="doc-table">

                <thead>
                  <tr>
                    <th style="width:5%">
                      ${esc(tp.no)}
                    </th>

                    <th
                      class="l"
                      style="width:22%"
                    >
                      ${esc(tp.item)}
                    </th>

                    <th
                      class="l"
                      style="width:28%"
                    >
                      ${esc(tp.description)}
                    </th>

                    <th style="width:9%">
                      ${esc(tp.unit)}
                    </th>

                    <th style="width:8%">
                      ${esc(tp.qty)}
                    </th>

                    <th
                      class="r"
                      style="width:14%"
                    >
                      ${esc(tp.unitPrice)}
                    </th>

                    <th
                      class="r"
                      style="width:14%"
                    >
                      ${esc(tp.total)}
                    </th>
                  </tr>
                </thead>

                <tbody>

                  ${
                    itemsHtml ||
                    `
                      <tr>
                        <td
                          colspan="7"
                          style="
                            text-align:center;
                            padding:12px;
                            color:#999
                          "
                        >
                          ${esc(tp.noItems)}
                        </td>
                      </tr>
                    `
                  }

                </tbody>

              </table>

              <div class="pi-totals">

                <table>

                  <tr>
                    <td>
                      ${esc(tp.subtotal)}
                    </td>

                    <td class="tv">
                      ${formatCurrency(subtotal)}
                    </td>
                  </tr>

                  ${
                    discountAmount > 0
                      ? `
                        <tr>
                          <td>
                            ${esc(tp.discount)}
                          </td>

                          <td class="tv">
                            - ${formatCurrency(
                              discountAmount,
                            )}
                          </td>
                        </tr>
                      `
                      : ''
                  }

                  ${
                    enableTax && taxAmount > 0
                      ? `
                        <tr>
                          <td>
                            ${esc(tp.tax)}
                            (${taxRate}%)
                          </td>

                          <td class="tv">
                            ${formatCurrency(taxAmount)}
                          </td>
                        </tr>
                      `
                      : ''
                  }

                  <tr class="grand">

                    <td>
                      <strong>
                        ${esc(tp.grandTotal)}
                      </strong>
                    </td>

                    <td class="tv">
                      <strong>
                        ${formatCurrency(grandTotal)}
                      </strong>
                    </td>

                  </tr>

                </table>

              </div>

              ${
                terms
                  ? `
                    <div class="pi-notes">
                      <h4>
                        ${esc(tp.termsConditions)}
                      </h4>

                      <p>
                        ${esc(terms)}
                      </p>
                    </div>
                  `
                  : ''
              }

              ${
                customerNotes
                  ? `
                    <div
                      class="pi-notes"
                      style="margin-top:8px"
                    >
                      <h4>
                        ${esc(tp.customerNotes)}
                      </h4>

                      <p>
                        ${esc(customerNotes)}
                      </p>
                    </div>
                  `
                  : ''
              }

              ${signatureHtml}

            </div>

            ${footerHtml}

          </div>

        </body>
      </html>
    `;
  }, [
    bizInfo,
    lineItems,
    selectedCustomer,
    invoiceNo,
    quotationDate,
    subtotal,
    discountAmount,
    enableTax,
    taxAmount,
    taxRate,
    grandTotal,
    terms,
    customerNotes,
    user,
    showWatermark,
    showSignature,
    tp,
  ]);

  /*
   * ------------------------------------------------------------
   * PREVIEW
   * ------------------------------------------------------------
   */

  const handlePreview = useCallback(() => {
    if (!bizInfo) return;

    setPreviewHtml(buildInvoiceHtml());
    setPreviewOpen(true);
  }, [bizInfo, buildInvoiceHtml]);

  /*
   * ------------------------------------------------------------
   * PRINT
   * ------------------------------------------------------------
   */

  const handlePrint = useCallback(() => {
    printHtmlDocument(buildInvoiceHtml());
    setPreviewOpen(false);
  }, [buildInvoiceHtml]);

  /*
   * ------------------------------------------------------------
   * VALIDATION
   * ------------------------------------------------------------
   */

  const validateForm = useCallback((): string | null => {
    if (!customerId) {
      return tp.selectCustomerFirst;
    }

    const hasItems = lineItems.some(
      (item) => item.productName.trim(),
    );

    if (!hasItems) {
      return tp.addAtLeastOneItem;
    }

    return null;
  }, [customerId, lineItems, tp]);

  /*
   * ------------------------------------------------------------
   * SAVE PROFORMA
   *
   * MAIN DATABASE FIX
   * ------------------------------------------------------------
   */

  const saveProforma = useCallback(
    async (status: 'draft' | 'completed') => {
      const validationError = validateForm();

      if (validationError) {
        setError(validationError);
        setSuccess('');
        return;
      }

      if (!user) return;

      const db = getDb();
      const cust = selectedCustomer;

      const itemsToSave = lineItems.filter(
        (item) => item.productName.trim(),
      );

      try {
        await db.query('BEGIN');

        /*
         * ------------------------------------------------------
         * UPDATE EXISTING PROFORMA
         * ------------------------------------------------------
         */

        if (editingId) {
          await db.query(
            `UPDATE proforma_invoices
             SET
              customer_id = $1,
              customer_name = $2,
              customer_phone = $3,
              customer_tin = $4,
              customer_address = $5,
              quotation_date = $6,
              status = $7,
              subtotal = $8,
              discount_amount = $9,
              discount_type = $10,
              discount_value = $11,
              tax_rate = $12,
              tax_enabled = $13,
              tax_amount = $14,
              grand_total = $15,
              terms = $16,
              notes = $17,
              show_watermark = $18,
              show_signature = $19,
              updated_at = now()
             WHERE id = $20`,
            [
              cust?.id ?? null,
              cust?.full_name ?? '',
              cust?.phone ?? null,
              cust?.tin_number ?? null,
              cust?.address ?? null,
              quotationDate || null,
              status,
              subtotal,
              discountAmount,
              discountType,
              discount,
              taxRate,
              enableTax,
              taxAmount,
              grandTotal,
              terms,
              customerNotes,
              showWatermark,
              showSignature,
              editingId,
            ],
          );

          /*
           * Existing items are replaced inside the same
           * transaction. If anything fails, ROLLBACK restores
           * the previous state.
           */
          await db.query(
            `DELETE FROM proforma_items
             WHERE proforma_id = $1`,
            [editingId],
          );

          /*
           * ----------------------------------------------------
           * SAVE PRODUCTS + SERVICES CORRECTLY
           * ----------------------------------------------------
           */
          for (const item of itemsToSave) {
            const isService =
              item.itemType === 'service';

            await db.query(
              `INSERT INTO proforma_items (
                proforma_id,
                product_id,
                service_id,
                item_type,
                product_name,
                description,
                unit,
                quantity,
                unit_price,
                total
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
              )`,
              [
                editingId,

                /*
                 * Product gets product_id.
                 * Service gets NULL here.
                 */
                isService
                  ? null
                  : item.productId || null,

                /*
                 * Service gets service_id.
                 * Product gets NULL here.
                 */
                isService
                  ? item.serviceId || null
                  : null,

                item.itemType,
                item.productName,
                item.description,
                item.unit,
                item.quantity,
                item.unitPrice,
                item.total,
              ],
            );
          }

          setSuccess(
            status === 'draft'
              ? tp.updatedDraft
              : tp.updatedComplete,
          );
        } else {
          /*
           * ----------------------------------------------------
           * CREATE NEW PROFORMA
           * ----------------------------------------------------
           */

          const newNo = await generateInvoiceNo();

          const insRes = await db.query<{ id: number }>(
            `INSERT INTO proforma_invoices (
              invoice_no,
              customer_id,
              customer_name,
              customer_phone,
              customer_tin,
              customer_address,
              quotation_date,
              user_id,
              status,
              subtotal,
              discount_amount,
              discount_type,
              discount_value,
              tax_rate,
              tax_enabled,
              tax_amount,
              grand_total,
              terms,
              notes,
              show_watermark,
              show_signature
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18,
              $19,
              $20,
              $21
            )
            RETURNING id`,
            [
              newNo,
              cust?.id ?? null,
              cust?.full_name ?? '',
              cust?.phone ?? null,
              cust?.tin_number ?? null,
              cust?.address ?? null,
              quotationDate || null,
              user.id,
              status,
              subtotal,
              discountAmount,
              discountType,
              discount,
              taxRate,
              enableTax,
              taxAmount,
              grandTotal,
              terms,
              customerNotes,
              showWatermark,
              showSignature,
            ],
          );

          const newId = (
            insRes.rows[0] as { id: number }
          ).id;

          /*
           * ----------------------------------------------------
           * SAVE NEW ITEMS
           * ----------------------------------------------------
           */

          for (const item of itemsToSave) {
            const isService =
              item.itemType === 'service';

            await db.query(
              `INSERT INTO proforma_items (
                proforma_id,
                product_id,
                service_id,
                item_type,
                product_name,
                description,
                unit,
                quantity,
                unit_price,
                total
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
              )`,
              [
                newId,

                isService
                  ? null
                  : item.productId || null,

                isService
                  ? item.serviceId || null
                  : null,

                item.itemType,
                item.productName,
                item.description,
                item.unit,
                item.quantity,
                item.unitPrice,
                item.total,
              ],
            );
          }

          setInvoiceNo(newNo);

          setSuccess(
            status === 'draft'
              ? tp.savedDraft
              : tp.savedComplete,
          );
        }

        setError('');

        await db.query('COMMIT');

        await loadSavedProformas();

        if (status === 'completed') {
          resetForm();
        }
      } catch {
        /*
         * IMPORTANT:
         * If saving any item fails, restore the database to
         * exactly the state it had before this save operation.
         */
        try {
          await db.query('ROLLBACK');
        } catch {
          // Nothing else to do.
        }

        setError(tp.errorSaving);
        setSuccess('');
      }
    },
    [
      validateForm,
      user,
      selectedCustomer,
      lineItems,
      editingId,
      quotationDate,
      subtotal,
      discountAmount,
      discountType,
      discount,
      taxRate,
      enableTax,
      taxAmount,
      grandTotal,
      terms,
      customerNotes,
      showWatermark,
      showSignature,
      tp,
      generateInvoiceNo,
      loadSavedProformas,
    ],
  );

  /*
   * ------------------------------------------------------------
   * LOAD PROFORMA FOR EDIT
   *
   * Old backup records:
   * item_type defaults to "product".
   *
   * New service records:
   * item_type = service
   * service_id = service ID
   * ------------------------------------------------------------
   */

  const loadProformaForEdit = useCallback(
    async (pf: SavedProforma) => {
      const db = getDb();

      const itemsRes =
        await db.query<SavedProformaItem>(
          `SELECT *
           FROM proforma_items
           WHERE proforma_id = $1
           ORDER BY id`,
          [pf.id],
        );

      const items =
        itemsRes.rows as SavedProformaItem[];

      setEditingId(pf.id);
      setInvoiceNo(pf.invoice_no);
      setCustomerId(pf.customer_id ?? '');
      setQuotationDate(pf.quotation_date ?? '');

      setLineItems(
        items.length > 0
          ? items.map((item) => {
              /*
               * Defensive fallback for old data.
               * If item_type does not exist / is null,
               * treat it as product.
               */
              const itemType: ItemType =
                item.item_type === 'service'
                  ? 'service'
                  : 'product';

              return {
                id: lineIdCounter++,

                productId:
                  itemType === 'product'
                    ? item.product_id ?? ''
                    : '',

                serviceId:
                  itemType === 'service'
                    ? item.service_id ?? ''
                    : '',

                itemType,

                productName: item.product_name,

                description:
                  item.description ?? '',

                unit: item.unit ?? '',

                quantity: Number(item.quantity),

                unitPrice: Number(item.unit_price),

                total: Number(item.total),
              };
            })
          : [createEmptyLineItem()],
      );

      setError('');
      setSuccess('');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
    [],
  );

  /*
   * ------------------------------------------------------------
   * DUPLICATE PROFORMA
   * ------------------------------------------------------------
   */

  const duplicateProforma = useCallback(
    async (pf: SavedProforma) => {
      const db = getDb();

      const itemsRes =
        await db.query<SavedProformaItem>(
          `SELECT *
           FROM proforma_items
           WHERE proforma_id = $1
           ORDER BY id`,
          [pf.id],
        );

      const items =
        itemsRes.rows as SavedProformaItem[];

      setEditingId(null);

      const newNo = await generateInvoiceNo();

      setInvoiceNo(newNo);
      setCustomerId(pf.customer_id ?? '');
      setQuotationDate('');

      setLineItems(
        items.length > 0
          ? items.map((item) => {
              const itemType: ItemType =
                item.item_type === 'service'
                  ? 'service'
                  : 'product';

              return {
                id: lineIdCounter++,

                productId:
                  itemType === 'product'
                    ? item.product_id ?? ''
                    : '',

                serviceId:
                  itemType === 'service'
                    ? item.service_id ?? ''
                    : '',

                itemType,

                productName: item.product_name,

                description:
                  item.description ?? '',

                unit: item.unit ?? '',

                quantity: Number(item.quantity),

                unitPrice: Number(item.unit_price),

                total: Number(item.total),
              };
            })
          : [createEmptyLineItem()],
      );

      setSuccess(tp.duplicated);
      setError('');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
    [generateInvoiceNo, tp.duplicated],
  );

  /*
   * ------------------------------------------------------------
   * DELETE
   * ------------------------------------------------------------
   */

  const deleteProforma = useCallback(
    async (id: number) => {
      const db = getDb();

      try {
        await db.query(
          `DELETE FROM proforma_invoices
           WHERE id = $1`,
          [id],
        );

        setSuccess(tp.deleted);
        setError('');

        await loadSavedProformas();
      } catch {
        setError(tp.errorDeleting);
        setSuccess('');
      }
    },
    [loadSavedProformas, tp],
  );

  /*
   * ------------------------------------------------------------
   * RESET
   * ------------------------------------------------------------
   */

  const resetForm = useCallback(() => {
    setEditingId(null);

    setCustomerId('');
    setQuotationDate('');

    setLineItems([
      createEmptyLineItem(),
    ]);

    setDiscount(0);
    setDiscountType('fixed');

    setEnableTax(false);

    setShowWatermark(false);
    setShowSignature(false);

    setTerms('');
    setCustomerNotes('');

    setError('');
    setSuccess('');

    setActiveRowId(null);
    setProductSearch('');

    void generateInvoiceNo().then(
      setInvoiceNo,
    );
  }, [generateInvoiceNo]);

  /*
   * ------------------------------------------------------------
   * PDF
   * ------------------------------------------------------------
   */

  const handlePdf = useCallback(async () => {
    const { default: jsPDF } =
      await import('jspdf');

    const { default: autoTable } =
      await import('jspdf-autotable');

    if (!bizInfo) return;

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    });

    const pw =
      doc.internal.pageSize.getWidth();

    const ph =
      doc.internal.pageSize.getHeight();

    if (showWatermark) {
      doc.saveGraphicsState();

      doc.setGState(
        doc.GState({
          opacity: 0.06,
        }),
      );

      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setFontSize(60);

      doc.setTextColor(
        0,
        0,
        0,
      );

      doc.text(
        bizInfo.name,
        pw / 2,
        ph / 2,
        {
          align: 'center',
          angle: 30,
        },
      );

      doc.restoreGraphicsState();
    }

    /*
     * HEADER
     */

    doc.setFillColor(
      240,
      253,
      250,
    );

    doc.roundedRect(
      14,
      12,
      pw - 28,
      24,
      3,
      3,
      'F',
    );

    doc.setDrawColor(
      13,
      148,
      136,
    );

    doc.setLineWidth(0.6);

    doc.roundedRect(
      14,
      12,
      pw - 28,
      24,
      3,
      3,
      'S',
    );

    let headerY = 18;

    if (bizInfo.logoData) {
      try {
        const {
          base64,
          format: fmt,
        } =
          await resizeLogoForPdf(
            bizInfo.logoData,
          );

        doc.addImage(
          base64,
          fmt,
          18,
          16,
          14,
          14,
        );
      } catch {
        // Ignore invalid logo.
      }
    }

    doc.setFont(
      'helvetica',
      'bold',
    );

    doc.setFontSize(18);

    doc.setTextColor(
      15,
      118,
      110,
    );

    doc.text(
      bizInfo.name,
      pw / 2,
      headerY,
      {
        align: 'center',
      },
    );

    headerY += 5;

    doc.setFont(
      'helvetica',
      'normal',
    );

    doc.setFontSize(8.5);

    doc.setTextColor(
      71,
      85,
      105,
    );

    const infoLines: string[] = [];

    if (bizInfo.address) {
      infoLines.push(
        bizInfo.address,
      );
    }

    const contactText = [
      bizInfo.phone
        ? `Tel: ${bizInfo.phone}`
        : '',
      bizInfo.email || '',
    ]
      .filter(Boolean)
      .join(' | ');

    if (contactText) {
      infoLines.push(contactText);
    }

    const registrationText = [
      bizInfo.tinNumber
        ? `TIN: ${bizInfo.tinNumber}`
        : '',
      bizInfo.rssbNumber
        ? `RSSB: ${bizInfo.rssbNumber}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');

    if (registrationText) {
      infoLines.push(
        registrationText,
      );
    }

    for (const line of infoLines) {
      doc.text(
        line,
        pw / 2,
        headerY,
        {
          align: 'center',
        },
      );

      headerY += 3;
    }

    /*
     * TITLE
     */

    const titleY = 50;

    doc.setFont(
      'helvetica',
      'bold',
    );

    doc.setFontSize(20);

    doc.setTextColor(
      15,
      118,
      110,
    );

    doc.text(
      tp.proformaInvoice,
      pw / 2,
      titleY,
      {
        align: 'center',
      },
    );

    doc.setFont(
      'helvetica',
      'normal',
    );

    doc.setFontSize(11);

    doc.setTextColor(
      71,
      85,
      105,
    );

    doc.text(
      invoiceNo,
      pw / 2,
      titleY + 7,
      {
        align: 'center',
      },
    );

    doc.setDrawColor(
      13,
      148,
      136,
    );

    doc.setLineWidth(0.4);

    doc.line(
      pw / 2 - 40,
      titleY + 11,
      pw / 2 + 40,
      titleY + 11,
    );

    headerY = titleY + 18;

    /*
     * CUSTOMER META
     */

    const metaY = headerY;

    doc.setDrawColor(
      13,
      148,
      136,
    );

    doc.setLineWidth(0.3);

    doc.setFillColor(
      240,
      253,
      250,
    );

    doc.roundedRect(
      14,
      metaY,
      pw - 28,
      18,
      2,
      2,
      'FD',
    );

    doc.setFont(
      'helvetica',
      'bold',
    );

    doc.setFontSize(9);

    doc.setTextColor(
      15,
      118,
      110,
    );

    doc.text(
      `${tp.customer}:`,
      18,
      metaY + 5,
    );

    doc.setFont(
      'helvetica',
      'normal',
    );

    doc.setTextColor(
      0,
      0,
      0,
    );

    doc.text(
      selectedCustomer?.full_name ||
        '—',
      40,
      metaY + 5,
    );

    if (selectedCustomer?.phone) {
      doc.text(
        `${tp.phone}: ${selectedCustomer.phone}`,
        18,
        metaY + 10,
      );
    }

    if (selectedCustomer?.tin_number) {
      doc.text(
        `${tp.customerTin}: ${selectedCustomer.tin_number}`,
        18,
        metaY + 15,
      );
    }

    if (quotationDate) {
      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setTextColor(
        15,
        118,
        110,
      );

      doc.text(
        `${tp.quotationDate}:`,
        pw - 60,
        metaY + 10,
      );

      doc.setFont(
        'helvetica',
        'normal',
      );

      doc.setTextColor(
        0,
        0,
        0,
      );

      doc.text(
        formatDate(quotationDate),
        pw - 16,
        metaY + 10,
        {
          align: 'right',
        },
      );
    }

    headerY = metaY + 22;

    /*
     * TABLE
     */

    const tableRows = lineItems
      .filter(
        (item) => item.productName,
      )
      .map((item, index) => [
        String(index + 1),

        item.itemType === 'service'
          ? `${item.productName} (Service)`
          : item.productName,

        item.description || '',

        item.unit || '—',

        String(item.quantity),

        formatCurrency(
          item.unitPrice,
        ),

        formatCurrency(
          item.total,
        ),
      ]);

    autoTable(doc, {
      startY: headerY,

      head: [[
        tp.no,
        tp.item,
        tp.description,
        tp.unit,
        tp.qty,
        tp.unitPrice,
        tp.total,
      ]],

      body:
        tableRows.length
          ? tableRows
          : [[
              '',
              tp.noItems,
              '',
              '',
              '',
              '',
              '',
            ]],

      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        lineColor: [
          170,
          170,
          170,
        ],
        lineWidth: 0.1,
        overflow: 'linebreak',
      },

      headStyles: {
        fillColor: [
          219,
          234,
          254,
        ],
        textColor: [
          30,
          64,
          175,
        ],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [
          37,
          99,
          235,
        ],
      },

      columnStyles: {
        0: {
          halign: 'center',
          cellWidth: 10,
        },

        3: {
          halign: 'center',
          cellWidth: 18,
        },

        4: {
          halign: 'center',
          cellWidth: 12,
        },

        5: {
          halign: 'right',
        },

        6: {
          halign: 'right',
        },
      },

      alternateRowStyles: {
        fillColor: [
          248,
          250,
          252,
        ],
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

 const afterTable =
  (doc.lastAutoTable?.finalY ?? headerY) + 6;

    /*
     * TOTALS
     */

    const totX = pw - 75;

    let ty = afterTable;

    doc.setFontSize(9);

    doc.setFont(
      'helvetica',
      'normal',
    );

    doc.setTextColor(
      0,
      0,
      0,
    );

    doc.text(
      `${tp.subtotal}:`,
      totX,
      ty,
    );

    doc.text(
      formatCurrency(subtotal),
      pw - 14,
      ty,
      {
        align: 'right',
      },
    );

    ty += 5;

    if (discountAmount > 0) {
      doc.text(
        `${tp.discount}:`,
        totX,
        ty,
      );

      doc.text(
        `- ${formatCurrency(
          discountAmount,
        )}`,
        pw - 14,
        ty,
        {
          align: 'right',
        },
      );

      ty += 5;
    }

    if (
      enableTax &&
      taxAmount > 0
    ) {
      doc.text(
        `${tp.tax} (${taxRate}%):`,
        totX,
        ty,
      );

      doc.text(
        formatCurrency(taxAmount),
        pw - 14,
        ty,
        {
          align: 'right',
        },
      );

      ty += 5;
    }

    doc.setDrawColor(
      245,
      158,
      11,
    );

    doc.setLineWidth(0.6);

    doc.line(
      totX,
      ty,
      pw - 14,
      ty,
    );

    ty += 4;

    doc.setFont(
      'helvetica',
      'bold',
    );

    doc.setFontSize(12);

    doc.setTextColor(
      30,
      64,
      175,
    );

    doc.text(
      `${tp.grandTotal}:`,
      totX,
      ty,
    );

    doc.text(
      formatCurrency(grandTotal),
      pw - 14,
      ty,
      {
        align: 'right',
      },
    );

    doc.setTextColor(
      0,
      0,
      0,
    );

    /*
     * TERMS
     */

    if (terms) {
      ty += 10;

      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setFontSize(8);

      doc.setTextColor(
        15,
        118,
        110,
      );

      doc.text(
        `${tp.termsConditions}:`,
        14,
        ty,
      );

      ty += 4;

      doc.setFont(
        'helvetica',
        'normal',
      );

      doc.setFontSize(8);

      doc.setTextColor(
        85,
        85,
        85,
      );

      const lines =
        doc.splitTextToSize(
          terms,
          pw - 28,
        );

      doc.text(
        lines,
        14,
        ty,
      );

      ty +=
        lines.length * 3.5;
    }

    /*
     * CUSTOMER NOTES
     */

    if (customerNotes) {
      ty += 6;

      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setFontSize(8);

      doc.setTextColor(
        15,
        118,
        110,
      );

      doc.text(
        `${tp.customerNotes}:`,
        14,
        ty,
      );

      ty += 4;

      doc.setFont(
        'helvetica',
        'normal',
      );

      doc.setFontSize(8);

      doc.setTextColor(
        85,
        85,
        85,
      );

      const noteLines =
        doc.splitTextToSize(
          customerNotes,
          pw - 28,
        );

      doc.text(
        noteLines,
        14,
        ty,
      );

      ty +=
        noteLines.length * 3.5;
    }

    /*
     * SIGNATURE
     */

    if (showSignature) {
      let sigY = Math.max(
        ty + 14,
        afterTable + 50,
      );

      const footerReserve = 26;

      if (
        sigY + 12 >
        ph - footerReserve
      ) {
        doc.addPage();
        sigY = 30;
      }

      doc.setDrawColor(
        100,
        100,
        100,
      );

      doc.setLineWidth(0.3);

      doc.line(
        30,
        sigY,
        90,
        sigY,
      );

      doc.line(
        120,
        sigY,
        180,
        sigY,
      );

      doc.setFont(
        'helvetica',
        'bold',
      );

      doc.setFontSize(8);

      doc.setTextColor(
        0,
        0,
        0,
      );

      doc.text(
        user?.full_name || '—',
        60,
        sigY + 4,
        {
          align: 'center',
        },
      );

      doc.text(
        tp.preparedBy,
        60,
        sigY + 8,
        {
          align: 'center',
        },
      );

      doc.text(
        tp.customerReceived,
        150,
        sigY + 8,
        {
          align: 'center',
        },
      );
    }

    /*
     * FOOTER
     */

    const pageCount =
      doc.getNumberOfPages();

    const now = new Date();

    const printDateStr =
      `${now.getDate()}/${
        now.getMonth() + 1
      }/${now.getFullYear()}`;

    const printTimeStr =
      `${String(
        now.getHours(),
      ).padStart(2, '0')}:${
        String(
          now.getMinutes(),
        ).padStart(2, '0')
      }`;

    for (
      let page = 1;
      page <= pageCount;
      page++
    ) {
      doc.setPage(page);

      doc.setDrawColor(
        13,
        148,
        136,
      );

      doc.setLineWidth(0.3);

      doc.line(
        14,
        ph - 14,
        pw - 14,
        ph - 14,
      );

      doc.setFont(
        'helvetica',
        'normal',
      );

      doc.setFontSize(7);

      doc.setTextColor(
        100,
        100,
        100,
      );

      const addrParts = [
        bizInfo.address,
        bizInfo.phone
          ? `Tel: ${bizInfo.phone}`
          : '',
        bizInfo.email,
      ]
        .filter(Boolean)
        .join(' | ');

      doc.text(
        addrParts,
        pw / 2,
        ph - 10,
        {
          align: 'center',
        },
      );

      doc.setTextColor(
        150,
        150,
        150,
      );

      doc.text(
        tp.confidential,
        14,
        ph - 6,
      );

      doc.text(
        `${tp.printDate}: ${printDateStr} ${tp.printTime}: ${printTimeStr}`,
        pw / 2,
        ph - 6,
        {
          align: 'center',
        },
      );

      doc.text(
        `${tp.pageOf
          .replace(
            '{a}',
            String(page),
          )
          .replace(
            '{b}',
            String(pageCount),
          )} — Powered by MUD Software Company`,
        pw - 14,
        ph - 6,
        {
          align: 'right',
        },
      );
    }

    /*
     * SAVE PDF
     */

    if (isTauri()) {
      const bytes =
        new Uint8Array(
          doc.output(
            'arraybuffer',
          ),
        );

      const path =
        await saveFileDialog(
          `proforma-${invoiceNo}.pdf`,
          [
            {
              name: 'PDF',
              extensions: ['pdf'],
            },
          ],
        );

      if (!path) return;

      await writeFile(
        path,
        bytes,
      );
    } else {
      doc.save(
        `proforma-${invoiceNo}.pdf`,
      );
    }

    setPreviewOpen(false);
  }, [
    bizInfo,
    lineItems,
    selectedCustomer,
    invoiceNo,
    quotationDate,
    subtotal,
    discountAmount,
    enableTax,
    taxAmount,
    taxRate,
    grandTotal,
    terms,
    customerNotes,
    user,
    showWatermark,
    showSignature,
    tp,
  ]);

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  return (
    <div className="animate-page-in space-y-6">

      <PageHeader
        title={tp.title}
        subtitle={tp.subtitle}
        actionLabel={tp.printPreview}
        actionIcon={FileText}
        onAction={handlePreview}
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      {/* -------------------------------------------------------
          INVOICE DETAILS
      ------------------------------------------------------- */}

      <div className="card-base space-y-4 p-5">

        <div className="flex items-center gap-2">

          {editingId && (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {tp.edit}: {invoiceNo}
            </span>
          )}

          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            {tp.invoiceNo}: {invoiceNo}
          </span>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">

          <Select
            label={tp.customer}
            name="customer"
            value={String(customerId)}
            onChange={(e) =>
              setCustomerId(
                e.target.value
                  ? Number(e.target.value)
                  : '',
              )
            }
            options={[
              {
                value: '',
                label:
                  tp.selectCustomer,
              },

              ...customers.map(
                (customer) => ({
                  value: String(
                    customer.id,
                  ),
                  label:
                    customer.full_name,
                }),
              ),
            ]}
          />

          <Input
            label={tp.phone}
            name="phone"
            value={
              selectedCustomer?.phone ??
              ''
            }
            readOnly
          />

          <Input
            label={tp.customerTin}
            name="custTin"
            value={
              selectedCustomer?.tin_number ??
              ''
            }
            readOnly
          />

          <Input
            label={
              tp.quotationDateOptional
            }
            name="quotationDate"
            type="date"
            value={quotationDate}
            onChange={(e) =>
              setQuotationDate(
                e.target.value,
              )
            }
          />

        </div>

      </div>

      {/* -------------------------------------------------------
          ITEMS
      ------------------------------------------------------- */}

      <div className="card-base space-y-4 p-5">

        <div className="flex items-center justify-between">

          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {tp.items}
          </h3>

          <Button
            variant="secondary"
            size="sm"
            onClick={addLineItem}
          >
            <span className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {tp.addRow}
            </span>
          </Button>

        </div>

        {/* SEARCH PANEL */}

        {activeRowId !== null && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-700 dark:bg-teal-900/20">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                ref={searchRef}
                type="text"
                value={productSearch}
                onChange={(e) =>
                  setProductSearch(
                    e.target.value,
                  )
                }
                placeholder={
                  tp.searchProducts
                }
                className="input-base pl-9"
              />

            </div>

            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">

              {filteredProducts.length ===
              0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  {tp.noProductsFound}
                </p>
              ) : (
                filteredProducts
                  .slice(0, 12)
                  .map((item) => {
                    const isService =
                      item.itemType ===
                      'service';

                    const stock =
                      Number(
                        item.stock_quantity ??
                          0,
                      );

                    const isOut =
                      !isService &&
                      stock <= 0;

                    const isLow =
                      !isService &&
                      stock > 0 &&
                      stock <=
                        Number(
                          item.low_stock_threshold ??
                            5,
                        );

                    return (
                      <button
                        key={`${item.itemType}-${item.id}`}
                        onClick={() =>
                          selectProduct(
                            activeRowId,
                            item,
                          )
                        }
                        className="flex w-full items-start justify-between border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-teal-50 dark:border-slate-700/50 dark:hover:bg-teal-900/20"
                      >

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-2">

                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                              {item.name}
                            </p>

                            {isService && (
                              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Service
                              </span>
                            )}

                            {isOut && (
                              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                {tp.outOfStock}
                              </span>
                            )}

                            {isLow && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {tp.lowStock}
                              </span>
                            )}

                          </div>

                          <p className="text-xs text-slate-400">
                            {[
                              item.category,

                              item.unit
                                ? `${tp.unit}: ${item.unit}`
                                : '',

                              item.sku
                                ? `SKU: ${item.sku}`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>

                          {item.description && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {
                                item.description
                              }
                            </p>
                          )}

                        </div>

                        <span className="ml-4 shrink-0 text-sm font-bold text-teal-600 dark:text-teal-400">
                          {formatCurrency(
                            Number(
                              item.selling_price,
                            ),
                          )}
                        </span>

                      </button>
                    );
                  })
              )}

            </div>

            <button
              onClick={() =>
                setActiveRowId(null)
              }
              className="mt-2 text-xs text-slate-400 hover:text-slate-600"
            >
              {tp.cancelSearch}
            </button>

          </div>
        )}

        <div className="overflow-x-auto">

          <table className="w-full border-collapse text-sm">

            <thead>

              <tr className="border-b-2 border-slate-200 dark:border-slate-600">

                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                  {tp.no}
                </th>

                <th className="px-2 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                  {tp.item}
                </th>

                <th className="px-2 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                  {tp.description}
                </th>

                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                  {tp.unit}
                </th>

                <th className="px-2 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                  {tp.qty}
                </th>

                <th className="px-2 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                  {tp.unitPrice}
                </th>

                <th className="px-2 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                  {tp.total}
                </th>

                <th className="w-8"></th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">

              {lineItems.map(
                (item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >

                    <td className="px-2 py-2 text-center text-slate-400">
                      {index + 1}
                    </td>

                    <td className="px-2 py-2">

                      {/*
                       * FIX:
                       * Service has serviceId, not productId.
                       */}
                      {item.productId ||
                      item.serviceId ? (
                        <div className="flex items-center gap-1.5">

                          <div className="flex min-w-0 items-center gap-1.5">

                            <span className="font-semibold text-slate-800 dark:text-white">
                              {item.productName}
                            </span>

                            {item.itemType ===
                              'service' && (
                              <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Service
                              </span>
                            )}

                          </div>

                          <button
                            onClick={() =>
                              clearSelectedItem(
                                item.id,
                              )
                            }
                            className="rounded p-0.5 text-slate-400 hover:text-teal-600"
                            title={
                              tp.selectProduct
                            }
                          >
                            <Search className="h-3 w-3" />
                          </button>

                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            openProductSearch(
                              item.id,
                            )
                          }
                          className="flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:border-teal-400 hover:text-teal-600 dark:border-slate-600"
                        >
                          <Search className="h-3.5 w-3.5" />
                          {tp.selectProduct}
                        </button>
                      )}

                    </td>

                    <td className="px-2 py-2">

                      <input
                        type="text"
                        value={
                          item.description
                        }
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            'description',
                            e.target.value,
                          )
                        }
                        placeholder={
                          tp.description
                        }
                        className="w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-300"
                      />

                    </td>

                    <td className="px-2 py-2 text-center text-slate-600 dark:text-slate-300">
                      {item.unit || '—'}
                    </td>

                    <td className="px-2 py-2">

                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            'quantity',
                            Number(
                              e.target.value,
                            ),
                          )
                        }
                        className="input-base w-16 text-center"
                      />

                    </td>

                    <td className="px-2 py-2">

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.unitPrice
                        }
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            'unitPrice',
                            Number(
                              e.target.value,
                            ),
                          )
                        }
                        className="input-base w-28 text-right"
                      />

                    </td>

                    <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">
                      {formatCurrency(
                        item.total,
                      )}
                    </td>

                    <td className="px-2 py-2">

                      <button
                        onClick={() =>
                          removeLineItem(
                            item.id,
                          )
                        }
                        className="rounded p-1 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </td>

                  </tr>
                ),
              )}

            </tbody>

          </table>

        </div>

        {/* CALCULATIONS */}

        <div className="flex justify-end">

          <div className="w-64 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/30">

            <div className="flex justify-between text-sm">

              <span className="text-slate-600 dark:text-slate-400">
                {tp.subtotal}
              </span>

              <span className="font-semibold">
                {formatCurrency(
                  subtotal,
                )}
              </span>

            </div>

            <div className="flex items-center gap-2 text-sm">

              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(
                    e.target.value as
                      | 'fixed'
                      | 'percent',
                  )
                }
                className="input-base flex-1 text-xs"
              >
                <option value="fixed">
                  {tp.discountFixed}
                </option>

                <option value="percent">
                  {tp.discountPercent}
                </option>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) =>
                  setDiscount(
                    Number(
                      e.target.value,
                    ),
                  )
                }
                className="input-base w-20 text-right text-sm"
              />

            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">

              <input
                type="checkbox"
                checked={enableTax}
                onChange={(e) =>
                  setEnableTax(
                    e.target.checked,
                  )
                }
                className="h-4 w-4 rounded text-teal-600"
              />

              {tp.tax} ({taxRate}%)

            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">

              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) =>
                  setShowWatermark(
                    e.target.checked,
                  )
                }
                className="h-4 w-4 rounded text-teal-600"
              />

              {tp.showWatermark}

            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">

              <input
                type="checkbox"
                checked={showSignature}
                onChange={(e) =>
                  setShowSignature(
                    e.target.checked,
                  )
                }
                className="h-4 w-4 rounded text-teal-600"
              />

              {tp.showSignature}

            </label>

            <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-600">

              <span className="font-bold text-slate-800 dark:text-white">
                {tp.grandTotal}
              </span>

              <span className="font-bold text-teal-600 dark:text-teal-400">
                {formatCurrency(
                  grandTotal,
                )}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* -------------------------------------------------------
          NOTES
      ------------------------------------------------------- */}

      <div className="card-base space-y-3 p-5">

        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {tp.notesTerms}
        </h3>

        <div>

          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            {tp.termsConditions}
          </label>

          <textarea
            value={terms}
            onChange={(e) =>
              setTerms(
                e.target.value,
              )
            }
            rows={4}
            className="input-base"
          />

        </div>

        <div>

          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            {tp.customerNotes}
          </label>

          <textarea
            value={customerNotes}
            onChange={(e) =>
              setCustomerNotes(
                e.target.value,
              )
            }
            rows={2}
            placeholder={
              tp.customerNotesPlaceholder
            }
            className="input-base"
          />

        </div>

      </div>

      {/* -------------------------------------------------------
          ACTIONS
      ------------------------------------------------------- */}

      <div className="flex flex-wrap justify-end gap-3">

        <Button
          variant="secondary"
          onClick={resetForm}
        >
          <span className="flex items-center gap-1.5">
            <X className="h-4 w-4" />
            {tp.reset}
          </span>
        </Button>

        <Button
          variant="secondary"
          onClick={handlePdf}
        >
          <span className="flex items-center gap-1.5">
            <FileDown className="h-4 w-4" />
            {tp.exportPdf}
          </span>
        </Button>

        <Button
          variant="secondary"
          onClick={() =>
            saveProforma('draft')
          }
        >
          <span className="flex items-center gap-1.5">
            <Save className="h-4 w-4" />

            {editingId
              ? tp.updateDraft
              : tp.saveDraft}
          </span>
        </Button>

        <Button
          variant="secondary"
          onClick={handlePreview}
        >
          <span className="flex items-center gap-1.5">
            <Printer className="h-4 w-4" />
            {tp.printPreview}
          </span>
        </Button>

        <Button
          onClick={() =>
            saveProforma('completed')
          }
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />

            {editingId
              ? tp.updateComplete
              : tp.saveComplete}
          </span>
        </Button>

      </div>

      {/* -------------------------------------------------------
          SAVED PROFORMAS
      ------------------------------------------------------- */}

      <div className="card-base space-y-4 p-5">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {tp.savedProformas}
          </h3>

          <div className="flex items-center gap-2">

            <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">

              {(
                [
                  'all',
                  'draft',
                  'completed',
                ] as const
              ).map((filter) => (

                <button
                  key={filter}
                  onClick={() =>
                    setSavedFilter(
                      filter,
                    )
                  }
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    savedFilter ===
                    filter
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {filter === 'all'
                    ? t.common.all
                    : filter ===
                        'draft'
                      ? tp.draft
                      : tp.completed}
                </button>

              ))}

            </div>

            <input
              type="text"
              value={savedSearch}
              onChange={(e) =>
                setSavedSearch(
                  e.target.value,
                )
              }
              placeholder={
                tp.searchPlaceholder
              }
              className="input-base w-56 text-sm"
            />

          </div>

        </div>

        {loadingSaved ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {tp.loading}
          </p>
        ) : filteredSaved.length ===
          0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {savedFilter ===
            'draft'
              ? tp.noDrafts
              : savedFilter ===
                  'completed'
                ? tp.noCompleted
                : tp.noSavedProformas}
          </p>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full border-collapse text-sm">

              <thead>

                <tr className="border-b-2 border-slate-200 dark:border-slate-600">

                  <th className="px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                    {tp.no}
                  </th>

                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                    {tp.invoiceNo}
                  </th>

                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                    {tp.customer}
                  </th>

                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                    {tp.grandTotal}
                  </th>

                  <th className="px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                    {t.common.status}
                  </th>

                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                    {tp.actions}
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">

                {filteredSaved.map(
                  (pf, index) => (

                    <tr
                      key={pf.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >

                      <td className="px-3 py-2.5 text-center text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-3 py-2.5">

                        <span className="font-bold text-teal-700 dark:text-teal-400">
                          {pf.invoice_no}
                        </span>

                      </td>

                      <td className="px-3 py-2.5">

                        <div>

                          <span className="font-semibold text-slate-800 dark:text-white">
                            {pf.customer_name}
                          </span>

                          <span className="block text-xs text-slate-400">
                            {formatDate(
                              pf.created_at,
                            )}
                          </span>

                        </div>

                      </td>

                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-white">
                        {formatCurrency(
                          Number(
                            pf.grand_total,
                          ),
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-center">

                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            pf.status ===
                            'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {pf.status ===
                          'completed'
                            ? tp.completed
                            : tp.draft}
                        </span>

                      </td>

                      <td className="px-3 py-2.5">

                        <div className="flex items-center justify-end gap-1">

                          <button
                            onClick={() =>
                              loadProformaForEdit(
                                pf,
                              )
                            }
                            className="rounded p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20"
                            title={tp.edit}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() =>
                              duplicateProforma(
                                pf,
                              )
                            }
                            className="rounded p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20"
                            title={
                              tp.duplicate
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() =>
                              setConfirmDeleteId(
                                pf.id,
                              )
                            }
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={
                              tp.delete
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                        </div>

                      </td>

                    </tr>

                  ),
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* -------------------------------------------------------
          DELETE CONFIRMATION
      ------------------------------------------------------- */}

      {confirmDeleteId !== null && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">

                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />

              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {tp.delete}
              </h3>

            </div>

            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              {tp.confirmDelete}
            </p>

            <div className="flex justify-end gap-3">

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setConfirmDeleteId(
                    null,
                  )
                }
              >
                {t.common.cancel}
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  void deleteProforma(
                    confirmDeleteId,
                  );

                  setConfirmDeleteId(
                    null,
                  );
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  {tp.delete}
                </span>
              </Button>

            </div>

          </div>

        </div>

      )}

      {/* -------------------------------------------------------
          PRINT PREVIEW
      ------------------------------------------------------- */}

      <PrintPreviewModal
        open={previewOpen}
        onClose={() =>
          setPreviewOpen(false)
        }
        previewHtml={previewHtml}
        onPrint={handlePrint}
        onDownloadPdf={handlePdf}
        title={`${tp.title} — ${invoiceNo}`}
      />

    </div>
  );
}

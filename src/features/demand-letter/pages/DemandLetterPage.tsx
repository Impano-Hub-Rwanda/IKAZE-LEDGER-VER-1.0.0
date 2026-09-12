import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Download,
  FileText,
  Italic,
  List,
  ListOrdered,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Underline,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/Primitives';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { PrintPreviewModal } from '../../../components/ui/PrintPreviewModal';
import { getDb } from '../../../lib/database';
import { getBusinessInfo, type BusinessInfo } from '../../../lib/exportReport';
import { buildPrintHeader, PRINT_BASE_STYLES } from '../../../lib/printLayout';
import { isTauri, printHtmlDocument, saveFileDialog, writeFile } from '../../../lib/tauri';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';

interface CustomerOption {
  id: number;
  full_name: string;
  phone: string | null;
  address: string | null;
  outstanding: number;
}

interface CustomerDebtItem {
  id: number;
  debt_id: number;
  item_type: 'product' | 'service';
  product_name: string;
  product_id: number | null;
  service_id: number | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface CustomerDebt {
  id: number;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  created_at: string;
  status: string;
  items: CustomerDebtItem[];
}

interface SavedDemandLetter {
  id: number;
  reference: string;
  customer_id: number | null;
  customer_name: string | null;
  letter_date: string;
  deadline: string | null;
  subject: string;
  body_html: string;
  closing: string;
  admin_name: string;
  show_debt_table: boolean;
  recipient_label: string | null;
  created_at: string;
  updated_at: string;
}

const KINYARWANDA_DEFAULT_DEMAND_BODY = '<p>Bwana / Madamu,</p><p>Mbandikiye iyi baruwa ngira ngo nishyuye [Izina ry’Umukiriya] amafaranga asigaye angana na <strong>[Amafaranga Asigaye]</strong>.</p><p>Ayo mafaranga akomoka kuri:</p><p>Ku mugereka murahasanga factures, Bordereau de livraison.</p>';
const KINYARWANDA_DEFAULT_SUBJECT = 'Kwishyuza';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Demand-letter date: numeric day/month/year. */
const formatLetterDate = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Demand-letter number: 001, 002, 003... */
const formatLetterNumber = (value: number) => String(value).padStart(3, '0');

const esc = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeEditorHtml = (html: string) => {
  if (!html.trim()) return '';
  return html
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/<br\s*\/?>(?!$)/gi, '<br />');
};

const loadDefaultLogoData = async (): Promise<string | null> => {
  try {
    const response = await fetch('/icon.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};


interface PdfTextSegment { text: string; bold: boolean; italic: boolean; underline: boolean; }

const htmlToPdfBlocks = (html: string): PdfTextSegment[][] => {
  if (!html.trim()) return [];
  const root = document.createElement('div');
  root.innerHTML = html;
  const blocks: PdfTextSegment[][] = [];
  const all: PdfTextSegment[] = [];
  const walk = (node: Node, style: Omit<PdfTextSegment, 'text'>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').replace(/\u00a0/g, ' ');
      if (text) all.push({ text, ...style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') { all.push({ text: '\n', ...style }); return; }
    const next = { bold: style.bold || tag === 'strong' || tag === 'b', italic: style.italic || tag === 'em' || tag === 'i', underline: style.underline || tag === 'u' };
    if (tag === 'li') all.push({ text: '• ', ...style });
    el.childNodes.forEach((child) => walk(child, next));
    if (['p','div','li','h1','h2','h3','h4','h5','h6'].includes(tag)) all.push({ text: '\n', ...style });
  };
  root.childNodes.forEach((node) => walk(node, { bold: false, italic: false, underline: false }));
  let current: PdfTextSegment[] = [];
  for (const seg of all) {
    const parts = seg.text.split('\n');
    parts.forEach((part, index) => {
      if (part) current.push({ ...seg, text: part });
      if (index < parts.length - 1) {
        if (current.some((x) => x.text.trim())) blocks.push(current);
        current = [];
      }
    });
  }
  if (current.some((x) => x.text.trim())) blocks.push(current);
  return blocks.map((block) => {
    const merged: PdfTextSegment[] = [];
    for (const seg of block) {
      const prev = merged[merged.length - 1];
      if (prev && prev.bold === seg.bold && prev.italic === seg.italic && prev.underline === seg.underline) prev.text += seg.text;
      else merged.push({ ...seg });
    }
    return merged;
  });
};

export function DemandLetterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const dl = t.demandLetter;
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedDebts, setSelectedDebts] = useState<CustomerDebt[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLetters, setSavedLetters] = useState<SavedDemandLetter[]>([]);
  const [showSavedLetters, setShowSavedLetters] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [showDebtTable, setShowDebtTable] = useState(true);
  const [recipientLabel, setRecipientLabel] = useState('Bwana / Madamu muyobozi wa:');

  const [letterDate, setLetterDate] = useState(today());
  const [deadline, setDeadline] = useState('');
  const [subject, setSubject] = useState(KINYARWANDA_DEFAULT_SUBJECT);
  const [bodyHtml, setBodyHtml] = useState(KINYARWANDA_DEFAULT_DEMAND_BODY);
  const [closing, setClosing] = useState('Mbaye mbashimiye, Bwana Muyobozi, igisubizo cyanyu cyiza.');
  const [adminName, setAdminName] = useState(user?.full_name || '');
  const [reference, setReference] = useState('001');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adminName && user?.full_name) setAdminName(user.full_name);
  }, [user?.full_name, adminName]);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const db = getDb();
      const res = await db.query<CustomerOption>(
        `SELECT c.id, c.full_name, c.phone, c.address,
                COALESCE(SUM(CASE WHEN d.status <> 'paid' THEN GREATEST(d.total_amount - d.paid_amount, 0) ELSE 0 END), 0) AS outstanding
         FROM customers c
         LEFT JOIN debts d ON d.customer_id = c.id
         GROUP BY c.id, c.full_name, c.phone, c.address
         ORDER BY c.full_name ASC`,
      );
      setCustomers((res.rows as CustomerOption[]).map((row) => ({
        ...row,
        outstanding: Number(row.outstanding),
      })));
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
    void getBusinessInfo().then(setBusiness).catch(() => setBusiness(null));
  }, [loadCustomers]);

  const loadSavedLetters = useCallback(async () => {
    try {
      const db = getDb();
      const res = await db.query<SavedDemandLetter>(
        `SELECT id, reference, customer_id, customer_name, letter_date, deadline, subject, body_html, closing, admin_name, show_debt_table, recipient_label, created_at, updated_at
         FROM demand_letters
         ORDER BY updated_at DESC, id DESC`,
      );
      setSavedLetters(res.rows as SavedDemandLetter[]);
    } catch {
      setSavedLetters([]);
    }
  }, []);

  useEffect(() => {
    void loadSavedLetters();
  }, [loadSavedLetters]);

  // Generate the next simple sequential letter number. Legacy IB-... references
  // are ignored so new letters always use 001, 002, 003...
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = getDb();
        const res = await db.query<{ reference: string }>('SELECT reference FROM demand_letters');
        const maxNumber = (res.rows as { reference: string }[])
          .map((row) => /^\d+$/.test(String(row.reference).trim()) ? Number(row.reference) : 0)
          .reduce((max, value) => Math.max(max, value), 0);
        if (!cancelled) setReference(formatLetterNumber(maxNumber + 1));
      } catch {
        if (!cancelled) setReference('001');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === selectedId) ?? null,
    [customers, selectedId],
  );

  useEffect(() => {
    if (!selectedCustomer) {
      setSelectedDebts([]);
      return;
    }

    let cancelled = false;
    setLoadingDebts(true);
    void (async () => {
      try {
        const db = getDb();
        const res = await db.query<CustomerDebt>(
          `SELECT id, total_amount, paid_amount, due_date, created_at, status
           FROM debts
           WHERE customer_id = $1 AND status <> 'paid'
           ORDER BY created_at DESC`,
          [selectedCustomer.id],
        );
        const debts: CustomerDebt[] = (res.rows as CustomerDebt[]).map((row) => ({
          ...row,
          total_amount: Number(row.total_amount),
          paid_amount: Number(row.paid_amount),
          items: [],
        }));
        if (debts.length) {
          const debtIds = debts.map((d) => d.id);
          // Load the actual line items in the same customer-debt request.
          // The old implementation could leave the preview with only its
          // heading when the second request raced with customer changes.
          const itemRes = await db.query<CustomerDebtItem>(
            `SELECT di.id, di.debt_id, di.item_type, di.product_id, di.service_id,
                    COALESCE(
                      NULLIF(TRIM(di.product_name), ''),
                      NULLIF(TRIM(p.name), ''),
                      NULLIF(TRIM(s.name), '')
                    ) AS product_name,
                    di.quantity, di.unit_price, di.subtotal
             FROM debt_items di
             LEFT JOIN products p ON p.id = di.product_id
             LEFT JOIN services s ON s.id = di.service_id
             WHERE di.debt_id = ANY($1::int[])
               AND (di.product_id IS NOT NULL OR di.service_id IS NOT NULL)
               AND COALESCE(NULLIF(TRIM(di.product_name), ''), NULLIF(TRIM(p.name), ''), NULLIF(TRIM(s.name), '')) IS NOT NULL
             ORDER BY di.debt_id, di.id`,
            [debtIds],
          );
          const byDebt = new Map<number, CustomerDebtItem[]>();
          for (const item of (itemRes.rows as CustomerDebtItem[])) {
            const itemName = String(item.product_name ?? '').trim();
            if (!itemName) continue;
            const arr = byDebt.get(item.debt_id) ?? [];
            arr.push({ ...item, product_name: itemName, quantity: Number(item.quantity), unit_price: Number(item.unit_price), subtotal: Number(item.subtotal) });
            byDebt.set(item.debt_id, arr);
          }
          for (const debt of debts) debt.items = byDebt.get(debt.id) ?? [];
        }
        if (!cancelled) setSelectedDebts(debts);
      } finally {
        if (!cancelled) setLoadingDebts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomer]);

  const outstanding = selectedCustomer?.outstanding ?? 0;

  const applyFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) setBodyHtml(normalizeEditorHtml(editorRef.current.innerHTML));
  };

  const handleEditorInput = () => {
    if (editorRef.current) setBodyHtml(normalizeEditorHtml(editorRef.current.innerHTML));
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  };

  // Keep the editor stable while typing. React must not rewrite innerHTML on
  // every keystroke, otherwise the caret/selection jumps and typing feels unlike Word.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== bodyHtml) editor.innerHTML = bodyHtml;
  }, [bodyHtml]);

  const previewHtml = useMemo(() => {
    const b = business ?? {
      name: 'Ubucuruzi Bwanjye', ownerName: null, phone: null, email: null, address: null,
      slogan: null, logoData: '/icon.png', tinNumber: null, rssbNumber: null, website: null,
      bankName: null, bankAccount: null, showOwnerOnReports: true, showOwnerOnReceipts: true,
    };

    const debtItems = selectedDebts
      .flatMap((debt) => debt.items)
      .filter((item) => (item.product_id != null || item.service_id != null) && String(item.product_name ?? '').trim());
    const debtRows = showDebtTable && selectedCustomer && debtItems.length
      ? `<div class="debt-summary">
          <div class="debt-summary-title">${esc(dl.summaryTitle)}</div>
          <table class="debt-table">
            <thead><tr>
              <th>Igicuruzwa</th><th class="c">Ingano</th><th class="r">Igiciro kuri kimwe</th><th class="r">Igiteranyo</th>
            </tr></thead>
            <tbody>${debtItems.map((item) => `<tr>
                <td>${esc(String(item.product_name).trim())}</td>
                <td class="c">${item.quantity}</td>
                <td class="r nowrap">${formatCurrency(item.unit_price)}</td>
                <td class="r nowrap">${formatCurrency(item.subtotal)}</td>
              </tr>`).join('')}</tbody>
          </table>
          <div class="debt-total"><span>${esc(dl.totalBalance)} = ${esc(formatCurrency(outstanding))}</span></div>
        </div>`
      : '';

    const recipient = selectedCustomer
      ? `<div class="recipient"><strong>${esc(recipientLabel.trim() || 'Bwana / Madamu muyobozi wa:')} ${esc(selectedCustomer.full_name)}</strong>${selectedCustomer.address ? `<span>${esc(selectedCustomer.address)}</span>` : ''}</div>`
      : `<div class="recipient"><strong>${esc(recipientLabel.trim() || 'Bwana / Madamu muyobozi wa:')}</strong><span></span></div>`;

    // Resolve the built-in placeholders only in the printed/previewed document.
    // The editor keeps the original text editable so the user can still change it.
    const outputBodyHtml = (bodyHtml || '<p></p>')
      .replace(/\[Izina ry’Umukiriya\]/gi, selectedCustomer?.full_name || '')
      .replace(/\[Customer Name\]/gi, selectedCustomer?.full_name || '')
      .replace(/\[Amafaranga Asigaye\]/gi, formatCurrency(outstanding))
      .replace(/\[Outstanding Amount\]/gi, formatCurrency(outstanding));

    // Put the live debt-items table exactly below the "amount arises from" sentence.
    // Any text the user writes after that sentence remains below the table.
    const originCandidates = [dl.debtOriginTitle.replace(/:$/, '').trim(), 'Ayo mafaranga akomoka kuri', 'This amount arises from'];
    let bodyBeforeDebt = outputBodyHtml;
    let bodyAfterDebt = '';
    for (const marker of originCandidates) {
      const markerIndex = bodyBeforeDebt.toLocaleLowerCase().indexOf(marker.toLocaleLowerCase());
      if (markerIndex >= 0) {
        const paragraphEnd = bodyBeforeDebt.indexOf('</p>', markerIndex);
        if (paragraphEnd >= 0) {
          bodyAfterDebt = bodyBeforeDebt.slice(paragraphEnd + 4);
          bodyBeforeDebt = bodyBeforeDebt.slice(0, paragraphEnd + 4);
        }
        break;
      }
    }

    return `<!doctype html><html><head><meta charset="utf-8" /><title>${esc(dl.title)}</title><style>
      ${PRINT_BASE_STYLES}
      @page{size:A4 portrait;margin:0}
      html,body{background:#fff!important;color:#111!important;color-scheme:light!important;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.65}
      .page{position:relative;width:210mm;min-height:297mm;box-sizing:border-box;margin:0 auto;padding:20mm 25.4mm 30mm;page-break-after:auto;break-after:auto;background:#fff}
      .letter-meta{margin-top:7mm;font-size:10.5pt;line-height:1.65;color:#111;display:grid;grid-template-columns:minmax(0,50%) minmax(0,1fr);column-gap:8mm;align-items:start}.recipient{grid-column:1;grid-row:1;min-width:0;max-width:100%;line-height:1.65;color:#111;overflow-wrap:anywhere;word-break:normal}.recipient strong{display:block;font-size:10.5pt;font-weight:400;max-width:100%;overflow-wrap:anywhere}.recipient span:not(.recipient-label){display:block;font-size:10.5pt;max-width:100%;overflow-wrap:anywhere}.letter-side{grid-column:2;grid-row:1;min-width:0;display:flex;flex-direction:column;align-items:flex-end;text-align:right;line-height:1.65}.letter-date{margin:0;color:#111;font-weight:400;white-space:nowrap}.letter-ref{margin-top:3mm;margin-bottom:7mm;text-align:left;white-space:nowrap;font-size:10.5pt;color:#111}.subject{margin-top:0;margin-bottom:6mm;font-weight:400;text-decoration:none;font-size:10.5pt;color:#111}.subject .subject-label{text-decoration:underline;text-underline-offset:2px}.subject .subject-value{text-decoration:none}.letter-body{font-size:10.5pt;line-height:1.7;color:#111}.letter-body p{margin:0 0 4mm;break-inside:avoid;page-break-inside:avoid}.letter-body ol,.letter-body ul{margin:0 0 4mm 8mm;padding-left:8mm}.letter-body strong{font-weight:400}
      .debt-summary{margin:2mm 0 3mm}.debt-summary-title{font-size:8.5pt;font-weight:600;margin-bottom:1.5mm;color:#111}.debt-origin{margin-top:4mm;margin-bottom:2mm;font-size:10.5pt}.debt-box{border:0;overflow:visible}.debt-table{width:100%;border-collapse:collapse;font-size:8.2pt;table-layout:fixed;page-break-inside:auto;color:#111}.debt-table thead{display:table-header-group}.debt-table tr{page-break-inside:avoid;break-inside:avoid}.debt-table th{padding:3px 3px;border:1px solid #cbd5e1;background:#fff;color:#111;text-align:left;font-size:8.2pt}.debt-table td{padding:3px 3px;border:1px solid #e2e8f0;word-break:break-word;color:#111;font-size:8.2pt}.debt-table th:nth-child(1){width:46%}.debt-table th:nth-child(2){width:12%}.debt-table th:nth-child(3){width:21%}.debt-table th:nth-child(4){width:21%}.debt-table .r,.debt-table td.r{text-align:right}.debt-table .c,.debt-table td.c{text-align:center}.nowrap{white-space:nowrap}.debt-total{display:block;padding:3px 0;background:#fff;font-size:9pt;page-break-inside:avoid;color:#111}.debt-total strong{color:#111;font-size:9pt}
      .deadline{font-size:10.5pt;line-height:1.6;margin-top:5mm;padding:7px 9px;background:#fff;border-left:1px solid #111;page-break-inside:avoid;color:#111}.conclusion{font-size:10.5pt;line-height:1.7;margin-top:7mm;margin-bottom:4mm;page-break-inside:avoid;break-inside:avoid;color:#111}.signature{margin-top:5mm;font-size:10.5pt;page-break-inside:avoid;break-inside:avoid;color:#111}.admin-name{margin-top:5mm;font-weight:400;font-size:10.5pt;color:#111}
      .pf-wrap{position:absolute;left:25.4mm;right:25.4mm;bottom:6mm;margin:0;z-index:999;background:#fff;height:20mm;overflow:hidden}.pf-inner{border-top:1px solid #0d9488;padding-top:3px;background:#fff}.pf-contact{text-align:center;font-size:8.5px;line-height:1.4;color:#475569;margin-bottom:4px}.pf-meta{display:flex;justify-content:space-between;align-items:flex-start;font-size:8px;line-height:1.35;color:#666;gap:8px}.pf-meta span{flex:1}.pf-meta span:nth-child(2){text-align:center}.pf-meta span:last-child{text-align:right}
      @media print{html,body{background:#fff!important;color:#111!important;color-scheme:light!important}.page{width:210mm;min-height:297mm;margin:0;padding:20mm 25.4mm 30mm;break-after:auto}.pf-wrap{position:fixed!important;left:25.4mm!important;right:25.4mm!important;bottom:6mm!important;height:20mm!important;z-index:999!important;background:#fff!important}.letter-ref{break-after:avoid;page-break-after:avoid}.subject{break-before:avoid;page-break-before:avoid}}
    </style></head><body><div class="page">
      ${buildPrintHeader({ businessInfo: b, documentTitle: '', showLogo: true })}
      <div class="letter-meta">
        ${recipient}
        <div class="letter-side">
          <div class="letter-date">${esc(letterDate ? formatLetterDate(letterDate) : '')}</div>
        </div>
      </div>
      <div class="letter-ref">No: ${esc(reference || '001')}</div>
      <div class="subject"><span class="subject-label">${esc(dl.subject || 'Impamvu')}</span>: <span class="subject-value">${esc(subject || KINYARWANDA_DEFAULT_SUBJECT)}</span></div>
      <div class="letter-body">${bodyBeforeDebt}</div>
      ${debtRows}
      <div class="letter-body">${bodyAfterDebt}</div>
      ${deadline ? `<div class="deadline"><strong>${esc(dl.deadlineLabel)}:</strong> ${esc(formatLetterDate(deadline))}</div>` : ''}
      <div class="conclusion">${esc(closing || 'Mbaye mbashimiye, Bwana Muyobozi, igisubizo cyanyu cyiza.')}</div>
      <div class="signature"><div class="admin-name">Umuyobozi wa ${esc(adminName || user?.full_name || '')}</div></div>
      <div class="pf-wrap"><div class="pf-inner"><div class="pf-contact">${[b.address, b.phone, b.email].filter(Boolean).map((v) => esc(String(v))).join(' &nbsp;|&nbsp; ')}</div><div class="pf-meta"><span>${esc(dl.confidential)}</span><span>${esc(dl.pageLabel)}</span><span>${esc(dl.poweredBy)}</span></div></div></div>
    </div></body></html>`;
  }, [business, selectedCustomer, selectedDebts, outstanding, showDebtTable, letterDate, deadline, subject, bodyHtml, closing, reference, dl, user, adminName, recipientLabel]);

  const downloadPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const m = 25.4;
      const footerReserve = 30;
      const contentBottom = ph - footerReserve;
      let y = 15;

      // Keep the Demand Letter header consistent with the shared Reports header.
      const headerTop = 12;
      const headerH = Math.max(28, 24 + (business?.slogan ? 3.5 : 0) + (business?.address ? 3.5 : 0) + ((business?.phone || business?.email || business?.website) ? 3.5 : 0) + ((business?.tinNumber || business?.rssbNumber) ? 3.5 : 0));
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.6);
      doc.roundedRect(m, headerTop, pw - 2 * m, headerH, 3, 3, 'FD');
      doc.setLineWidth(0.2);

      const logoSource = business?.logoData || await loadDefaultLogoData();
      if (logoSource) {
        try {
          const { resizeLogoForPdf } = await import('../../../lib/printLayout');
          const logo = await resizeLogoForPdf(logoSource, 120);
          doc.addImage(logo.base64, logo.format, m + 3, headerTop + 4, 20, 20);
        } catch { /* text header remains usable */ }
      }

      const centerX = pw / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 118, 110);
      doc.text(business?.name || 'Ubucuruzi Bwanjye', centerX, headerTop + 9, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      let headerY = headerTop + 14;
      if (business?.slogan) { doc.setFont('helvetica', 'italic'); doc.text(business.slogan, centerX, headerY, { align: 'center' }); headerY += 3.5; doc.setFont('helvetica', 'normal'); }
      if (business?.address) { doc.text(business.address, centerX, headerY, { align: 'center' }); headerY += 3.5; }
      const contactParts = [business?.phone ? `Tel: ${business.phone}` : '', business?.email || '', business?.website || ''].filter(Boolean).join(' | ');
      if (contactParts) { doc.text(contactParts, centerX, headerY, { align: 'center' }); headerY += 3.5; }
      const regParts = [business?.tinNumber ? `TIN: ${business.tinNumber}` : '', business?.rssbNumber ? `RSSB: ${business.rssbNumber}` : ''].filter(Boolean).join(' | ');
      if (regParts) { doc.text(regParts, centerX, headerY, { align: 'center' }); }
      doc.setTextColor(0, 0, 0);

      y = headerTop + headerH + 6;
      doc.setTextColor(17, 17, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const rightX = pw - m;
      const halfWidth = (pw - 2 * m) / 2 - 4;
      const recipientText = selectedCustomer ? `${recipientLabel.trim() || 'Bwana / Madamu muyobozi wa:'} ${selectedCustomer.full_name}` : `${recipientLabel.trim() || 'Bwana / Madamu muyobozi wa:'} ____________________________`;
      const recipientLines = doc.splitTextToSize(recipientText, halfWidth);
      const addressLines = selectedCustomer?.address ? doc.splitTextToSize(selectedCustomer.address, halfWidth) : [];
      doc.text(recipientLines, m, y);
      if (addressLines.length) doc.text(addressLines, m, y + recipientLines.length * 5);
      if (letterDate) doc.text(formatLetterDate(letterDate), rightX, y, { align: 'right' });
      const leftBlockHeight = (recipientLines.length + addressLines.length) * 5;
      const refY = y + Math.max(leftBlockHeight, 5) + 5;
      doc.text(`No: ${reference || '001'}`, m, refY);
      y = refY + 8;

      const subjectLabel = dl.subject || 'Impamvu';
      const subjectValue = subject || KINYARWANDA_DEFAULT_SUBJECT;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(subjectLabel, m, y);
      const labelWidth = doc.getTextWidth(subjectLabel);
      doc.line(m, y + 1.5, m + labelWidth, y + 1.5);
      doc.text(`: ${subjectValue}`, m + labelWidth + 1.5, y);
      y += 8;

      doc.setTextColor(17, 17, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const originCandidatesPdf = [dl.debtOriginTitle.replace(/:$/, '').trim(), 'Ayo mafaranga akomoka kuri', 'This amount arises from'];
      const outputBodyHtmlPdf = (bodyHtml || '<p></p>')
        .replace(/\[Izina ry’Umukiriya\]/gi, selectedCustomer?.full_name || '')
        .replace(/\[Customer Name\]/gi, selectedCustomer?.full_name || '')
        .replace(/\[Amafaranga Asigaye\]/gi, formatCurrency(outstanding))
        .replace(/\[Outstanding Amount\]/gi, formatCurrency(outstanding));
      let bodyBeforeDebtPdf = outputBodyHtmlPdf;
      let bodyAfterDebtPdf = '';
      for (const marker of originCandidatesPdf) {
        const markerIndex = bodyBeforeDebtPdf.toLocaleLowerCase().indexOf(marker.toLocaleLowerCase());
        if (markerIndex >= 0) {
          const paragraphEnd = bodyBeforeDebtPdf.indexOf('</p>', markerIndex);
          if (paragraphEnd >= 0) {
            bodyAfterDebtPdf = bodyBeforeDebtPdf.slice(paragraphEnd + 4);
            bodyBeforeDebtPdf = bodyBeforeDebtPdf.slice(0, paragraphEnd + 4);
          }
          break;
        }
      }
      const drawRichBlocks = (html: string) => {
        const blocks = htmlToPdfBlocks(html);
        const maxWidth = pw - 2 * m;
        const lineHeight = 5.2;
        for (const block of blocks) {
          let lineX = m;
          let lineY = y;
          const flushLine = () => {
            y = lineY + lineHeight;
            lineX = m;
            lineY = y;
          };
          for (const segment of block) {
            const words = segment.text.split(/(\s+)/);
            for (const token of words) {
              if (!token) continue;
              const style = segment.bold ? (segment.italic ? 'bolditalic' : 'bold') : (segment.italic ? 'italic' : 'normal');
              doc.setFont('helvetica', style);
              doc.setFontSize(10.5);
              const tokenWidth = doc.getTextWidth(token);
              if (token === '\n' || lineX + tokenWidth > m + maxWidth) flushLine();
              if (lineY > contentBottom - 5) { doc.addPage(); y = 18; lineX = m; lineY = y; }
              doc.setFont('helvetica', style);
              doc.text(token, lineX, lineY);
              if (segment.underline && token.trim()) {
                doc.line(lineX, lineY + 0.8, lineX + tokenWidth, lineY + 0.8);
              }
              lineX += tokenWidth;
            }
          }
          y = lineY + lineHeight + 1.8;
        }
      };
      drawRichBlocks(bodyBeforeDebtPdf);

      const pdfDebtItems = selectedDebts
        .flatMap((debt) => debt.items)
        .filter((item) => (item.product_id != null || item.service_id != null) && String(item.product_name ?? '').trim());
      if (showDebtTable && selectedCustomer && pdfDebtItems.length) {
        doc.setTextColor(17, 17, 17);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(dl.summaryTitle, m, y);
        y += 4;
        const detailRows = pdfDebtItems.map((item) => [
          String(item.product_name).trim(),
          String(item.quantity),
          formatCurrency(Number(item.unit_price)),
          formatCurrency(Number(item.subtotal)),
        ]);
        if (detailRows.length && y > contentBottom - 18) { doc.addPage(); y = 18; }
        if (detailRows.length) autoTable(doc, {
          startY: y,
          head: [['Igicuruzwa', 'Ingano', 'Igiciro kuri kimwe', 'Igiteranyo']],
          body: detailRows,
          margin: { left: m, right: m, bottom: footerReserve },
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 8.2, textColor: [17, 17, 17], cellPadding: 1.4, overflow: 'linebreak' },
          headStyles: { fillColor: [255, 255, 255], textColor: [17, 17, 17], fontStyle: 'normal', fontSize: 8.2 },
          columnStyles: { 0: { cellWidth: 78 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 37, halign: 'right' }, 3: { cellWidth: 37, halign: 'right' } },
        });
        if (detailRows.length) y = (doc as any).lastAutoTable.finalY + 4;
        doc.setTextColor(17, 17, 17);
        doc.setFont('helvetica', 'normal');
        if (detailRows.length) {
          doc.setFontSize(9);
          doc.text(`${dl.totalBalance} = ${formatCurrency(outstanding)}`, m, y);
          y += 8;
        }
      }

      if (bodyAfterDebtPdf) drawRichBlocks(bodyAfterDebtPdf);

      if (deadline) {
        if (y > contentBottom - 15) { doc.addPage(); y = 18; }
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(17, 17, 17);
        doc.roundedRect(m, y, pw - 2 * m, 11, 2, 2, 'S');
        doc.setTextColor(17, 17, 17);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.text(`${dl.deadlineLabel}: ${formatDate(deadline)}`, m + 5, y + 7);
        y += 17;
      }

      const conclusionText = closing || 'Mbaye mbashimiye, Bwana Muyobozi, igisubizo cyanyu cyiza.';
      const conclusionLines = doc.splitTextToSize(conclusionText, pw - 2 * m);
      if (y > contentBottom - (conclusionLines.length * 5.2 + 14)) { doc.addPage(); y = 18; }
      doc.setTextColor(17, 17, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(conclusionLines, m, y);
      y += conclusionLines.length * 5.2 + 7;
      if (y > contentBottom - 10) { doc.addPage(); y = 18; }
      doc.text(adminName || user?.full_name || 'Administrator', m, y + 4);

      // One deterministic footer per PDF page. All body/table pagination reserves
      // the same bottom area, so content never enters the footer.
      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        const lineY = ph - 18;
        const contactY = ph - 12;
        const metaY = ph - 5;
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.35);
        doc.line(m, lineY, pw - m, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        const footer = [business?.phone, business?.email].filter(Boolean).join('  |  ');
        if (footer) doc.text(footer, pw / 2, contactY, { align: 'center' });
        doc.text(`${dl.confidential}  |  ${dl.pageLabel} ${page}/${totalPages}  |  ${dl.poweredBy}`, pw / 2, metaY, { align: 'center' });
      }

      const fileName = `${reference || 'ibarwa-yo-kwishyuzwa'}.pdf`;
      if (isTauri()) {
        const bytes = new Uint8Array(doc.output('arraybuffer'));
        const path = await saveFileDialog(fileName, [{ name: 'PDF', extensions: ['pdf'] }]);
        if (path) await writeFile(path, bytes);
      } else {
        doc.save(fileName);
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const saveDemandLetter = useCallback(async () => {
    if (!user || saving) return;
    if (!reference.trim()) {
      setSaveMessage(dl.reference);
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const db = getDb();
      await db.query(
        `INSERT INTO demand_letters (
          reference, customer_id, customer_name, letter_date, deadline, subject, body_html, closing, admin_name, show_debt_table, recipient_label, user_id, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
        ON CONFLICT (reference) DO UPDATE SET
          customer_id=EXCLUDED.customer_id, customer_name=EXCLUDED.customer_name, letter_date=EXCLUDED.letter_date,
          deadline=EXCLUDED.deadline, subject=EXCLUDED.subject, body_html=EXCLUDED.body_html, closing=EXCLUDED.closing, admin_name=EXCLUDED.admin_name,
          show_debt_table=EXCLUDED.show_debt_table, recipient_label=EXCLUDED.recipient_label, user_id=EXCLUDED.user_id, updated_at=now()`,
        [
          reference.trim(),
          selectedCustomer?.id ?? null,
          selectedCustomer?.full_name ?? null,
          letterDate || today(),
          deadline || null,
          subject.trim(),
          normalizeEditorHtml(bodyHtml),
          closing.trim(),
          adminName.trim() || user.full_name,
          showDebtTable,
          recipientLabel.trim() || 'Bwana / Madamu muyobozi wa:',
          user.id,
        ],
      );
      await loadSavedLetters();
      setSaveMessage(dl.saved);
    } catch {
      setSaveMessage(dl.saveError);
    } finally {
      setSaving(false);
    }
  }, [user, saving, reference, selectedCustomer, letterDate, deadline, subject, bodyHtml, closing, adminName, showDebtTable, recipientLabel, loadSavedLetters, dl]);

  const loadSavedLetter = useCallback((letter: SavedDemandLetter) => {
    setSelectedId(letter.customer_id ? String(letter.customer_id) : '');
    setLetterDate(letter.letter_date || today());
    setDeadline(letter.deadline || '');
    setSubject(letter.subject);
    const migratedBody = (letter.body_html || '').replace(/Nyakubahwa/gi, 'Bwana / Madamu').replace(/<p>\s*Mbaye mbashimiye, Bwana Muyobozi, igisubizo cyanyu cyiza\.\s*<\/p>/gi, '').replace(/<p>\s*Tubashimiye ubufatanye\.\s*<\/p>/gi, '');
    setBodyHtml(migratedBody);
    setClosing(letter.closing || 'Mbaye mbashimiye, Bwana Muyobozi, igisubizo cyanyu cyiza.');
    setAdminName(letter.admin_name || user?.full_name || '');
    setReference(letter.reference);
    setShowDebtTable(letter.show_debt_table);
    setRecipientLabel(letter.recipient_label || 'Bwana / Madamu muyobozi wa:');
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = migratedBody;
    });
    setSaveMessage('');
  }, [user?.full_name]);

  const deleteSavedLetter = useCallback(async (id: number) => {
    try {
      const db = getDb();
      await db.query('DELETE FROM demand_letters WHERE id = $1', [id]);
      await loadSavedLetters();
    } catch {
      setSaveMessage(dl.deleteError);
    }
  }, [loadSavedLetters, dl]);

  const reset = () => {
    setSaveMessage('');
    setSelectedId('');
    setSelectedDebts([]);
    setShowDebtTable(true);
    setRecipientLabel('Bwana / Madamu muyobozi wa:');
    setLetterDate(today());
    setDeadline('');
    void (async () => {
      try {
        const db = getDb();
        const res = await db.query<{ reference: string }>('SELECT reference FROM demand_letters');
        const maxNumber = (res.rows as { reference: string }[])
          .map((row) => /^\d+$/.test(String(row.reference).trim()) ? Number(row.reference) : 0)
          .reduce((max, value) => Math.max(max, value), 0);
        setReference(formatLetterNumber(maxNumber + 1));
      } catch { setReference('001'); }
    })();
    setSubject(KINYARWANDA_DEFAULT_SUBJECT);
    setBodyHtml(KINYARWANDA_DEFAULT_DEMAND_BODY);
    setClosing('Mbaye mbashimiye, Bwana Muyobozi, igisubizo cyanyu cyiza.');
    setAdminName(user?.full_name || '');
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = KINYARWANDA_DEFAULT_DEMAND_BODY;
    });
  };

  const toolbarButton = (label: string, icon: React.ReactNode, command: string, value?: string) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        applyFormat(command, value);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:bg-teal-950/30 dark:hover:text-teal-300"
    >
      {icon}
    </button>
  );

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        title={dl.title}
        subtitle={dl.subtitle}
        actionLabel={dl.reset}
        actionIcon={RotateCcw}
        onAction={reset}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-desk-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-white px-5 py-5 dark:border-slate-700 dark:from-teal-950/30 dark:to-slate-800 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm"><FileText className="h-5 w-5" /></div>
              <div><h2 className="font-semibold text-slate-900 dark:text-white">{dl.body}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{dl.subtitle}</p></div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label={dl.customer}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loadingCustomers}
                options={[
                  { value: '', label: dl.noCustomer },
                  ...customers.map((customer) => ({
                    value: String(customer.id),
                    label: `${customer.full_name} — ${formatCurrency(customer.outstanding)} asigaye`,
                  })),
                ]}
              />
              <Input label={dl.reference} value={reference} onChange={(e) => setReference(e.target.value)} inputMode="numeric" placeholder="001" />
              <Input label="Uwo ibaruwa igenewe" value={recipientLabel} onChange={(e) => setRecipientLabel(e.target.value)} placeholder="Bwana / Madamu muyobozi wa:" />
              <Input label={dl.date} type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} />
              <Input label={dl.deadline} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div className="mt-4"><Input label={dl.subject} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>

            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{dl.body}</label>
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60">
                  {toolbarButton(dl.writeBold, <Bold className="h-4 w-4" />, 'bold')}
                  {toolbarButton(dl.writeItalic, <Italic className="h-4 w-4" />, 'italic')}
                  {toolbarButton(dl.writeUnderline, <Underline className="h-4 w-4" />, 'underline')}
                  {toolbarButton(dl.bulletList, <List className="h-4 w-4" />, 'insertUnorderedList')}
                  {toolbarButton(dl.numberedList, <ListOrdered className="h-4 w-4" />, 'insertOrderedList')}
                </div>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={handleEditorPaste}
                className="min-h-[300px] w-full resize-y overflow-auto rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                role="textbox"
                aria-multiline="true"
              />
              <p className="mt-2 text-xs text-slate-400">{dl.editorHint}</p>
            </div>

            <div className="mt-4 space-y-3"><Input label="Umusozo" value={closing} onChange={(e) => setClosing(e.target.value)} /><Input label="Umuyobozi" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder={user?.full_name || ''} /></div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <input
                  id="show-debt-table"
                  type="checkbox"
                  checked={showDebtTable}
                  onChange={(e) => setShowDebtTable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="show-debt-table" className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
                  {dl.showDebtTable}
                </label>
              </div>
              <span className="text-xs text-slate-400">{dl.tickHint}</span>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}><FileText className="h-4 w-4" /> {dl.preview}</Button>
              <Button variant="secondary" onClick={() => void saveDemandLetter()} disabled={saving || !user}><Save className="h-4 w-4" /> {saving ? dl.saving : dl.save}</Button>
              <Button variant="secondary" onClick={() => void downloadPdf()} disabled={pdfLoading}><Download className="h-4 w-4" /> {pdfLoading ? dl.pdfPreparing : dl.downloadPdf}</Button>
              <Button onClick={() => void printHtmlDocument(previewHtml)}><Printer className="h-4 w-4" /> {dl.print}</Button>
            </div>
            {saveMessage && <p className="mt-3 text-right text-xs font-medium text-teal-700 dark:text-teal-300">{saveMessage}</p>}
          </div>
        </div>

        <div className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"><UserRound className="h-5 w-5" /></div><h3 className="font-semibold text-slate-800 dark:text-white">{dl.details}</h3></div></div>
          <div className="p-5">
            {selectedCustomer ? (
              <div className="space-y-4">
                <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{dl.customerLabel}</p><p className="mt-1 font-semibold text-slate-800 dark:text-white">{selectedCustomer.full_name}</p></div>
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/50 dark:bg-teal-900/20"><p className="text-xs font-medium text-teal-700 dark:text-teal-300">{dl.totalOutstanding}</p><p className="mt-1 text-2xl font-bold tracking-tight text-teal-800 dark:text-teal-200">{formatCurrency(outstanding)}</p></div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><WalletCards className="h-4 w-4" />{loadingDebts ? dl.loading : `${selectedDebts.length} ${selectedDebts.length === 1 ? dl.filesOne : dl.filesMany}`}</div>
                <div className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{dl.outstandingHint}</div>
              </div>
            ) : (
              <div className="py-4"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-slate-800"><FileText className="h-5 w-5" /></div><p className="mt-3 text-center text-sm leading-6 text-slate-500 dark:text-slate-400">{dl.customHint}</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-desk-sm dark:border-slate-700 dark:bg-slate-800">
        <button type="button" onClick={() => setShowSavedLetters((v) => !v)} className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{dl.savedLetters}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dl.savedLettersHint}</p>
          </div>
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">{savedLetters.length}</span>
        </button>
        {showSavedLetters && (
          <div className="p-4 sm:p-5">
            {savedLetters.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{dl.noSavedLetters}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {savedLetters.map((letter) => (
                  <div key={letter.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{letter.subject || dl.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{letter.reference}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{letter.customer_name || dl.noCustomer} • {formatDate(letter.letter_date)}</p>
                      </div>
                      <button type="button" title={dl.delete} aria-label={dl.delete} onClick={() => void deleteSavedLetter(letter.id)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <Button className="mt-3 w-full" variant="secondary" onClick={() => loadSavedLetter(letter)}>{dl.openSaved}</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PrintPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} previewHtml={previewHtml} onPrint={() => void printHtmlDocument(previewHtml)} title={dl.previewTitle} />
    </div>
  );
}

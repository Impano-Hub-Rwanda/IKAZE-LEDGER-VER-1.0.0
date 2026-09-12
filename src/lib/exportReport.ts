import { getDb } from './database';
import { formatCurrency } from '../utils/formatCurrency';
import type { jsPDF } from 'jspdf';
import { saveFileDialog, writeFile, isTauri, printHtmlDocument } from './tauri';
import { resizeLogoForPdf } from './printLayout';

// ── In-memory caches to avoid repeated DB queries for settings ──
let businessInfoCache: BusinessInfo | null = null;
let appSettingsCache: AppSettings | null = null;

/** Invalidate caches — call after settings are saved */
export function invalidateSettingsCache(): void {
  businessInfoCache = null;
  appSettingsCache = null;
}

export interface BusinessInfo {
  name: string;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  slogan: string | null;
  logoData: string | null;
  tinNumber: string | null;
  rssbNumber: string | null;
  website: string | null;
  bankName: string | null;
  bankAccount: string | null;
  showOwnerOnReports: boolean;
  showOwnerOnReceipts: boolean;
}

function getReportLanguageLabels() {
  const rw = typeof localStorage !== 'undefined' && localStorage.getItem('dms-language') === 'rw';
  return rw ? { confidential: 'Inyandiko y’Ubucuruzi y’Ibanga', powered: 'Byakozwe na MUD Software Company' } : { confidential: 'Confidential Business Document', powered: 'Powered by MUD Software Company' };
}

export async function getBusinessInfo(): Promise<BusinessInfo> {
  if (businessInfoCache) return businessInfoCache;
  const db = getDb();
  const res = await db.query<BusinessInfo>(
    `SELECT business_name AS name, owner_name AS "ownerName", phone, email,
            address, slogan, logo_data AS "logoData",
            tin_number AS "tinNumber", rssb_number AS "rssbNumber",
            website, bank_name AS "bankName", bank_account AS "bankAccount",
            show_owner_on_reports AS "showOwnerOnReports", show_owner_on_receipts AS "showOwnerOnReceipts"
     FROM settings WHERE id = 1`,
  );
  const row = (res.rows as BusinessInfo[])[0];
  if (row) { businessInfoCache = row; return row; }
  return { name: 'My Business', ownerName: null, phone: null, email: null, address: null, slogan: null, logoData: null,
    tinNumber: null, rssbNumber: null, website: null, bankName: null, bankAccount: null,
    showOwnerOnReports: true, showOwnerOnReceipts: true };
}

export function businessContact(info: BusinessInfo): string {
  const parts: string[] = [];
  if (info.address) parts.push(info.address);
  if (info.phone) parts.push(info.phone);
  if (info.email) parts.push(info.email);
  if (info.website) parts.push(info.website);
  if (info.tinNumber) parts.push(`TIN: ${info.tinNumber}`);
  if (info.rssbNumber) parts.push(`RSSB: ${info.rssbNumber}`);
  if (info.bankName) parts.push(`Bank: ${info.bankName}`);
  if (info.bankAccount) parts.push(`Acct: ${info.bankAccount}`);
  return parts.join(' · ') || '—';
}

export interface AppSettings {
  language: 'en' | 'rw';
  theme: 'light' | 'dark';
  dateFormat: string;
  receiptWidth: '58mm' | '80mm';
  reportPaperSize: 'a4' | 'a5';
  autoPrintDebt: boolean;
  autoPrintPayment: boolean;
  autoPrintConfigured: boolean;
  startupPage: string;
  autoSave: boolean;
  receiptHeader: string | null;
  receiptShowLogo: boolean;
  receiptShowSignature: boolean;
  receiptShowWatermark: boolean;
  reportHeader: string | null;
  reportFooter: string | null;
  defaultReport: string;
  taxEnabled: boolean;
  taxRate: number;
  sessionTimeoutMinutes: number;
  pinHash: string | null;
  openAtStartup: boolean;
  minimizeToTray: boolean;
  globalShortcut: string;
  signatureName: string | null;
  watermarkText: string | null;
}

export async function getAppSettings(): Promise<AppSettings> {
  if (appSettingsCache) return appSettingsCache;
  const db = getDb();
  const res = await db.query<AppSettings>(
    `SELECT language, theme, date_format AS "dateFormat", receipt_width AS "receiptWidth",
            report_paper_size AS "reportPaperSize", auto_print_debt AS "autoPrintDebt",
            auto_print_payment AS "autoPrintPayment", auto_print_configured AS "autoPrintConfigured", startup_page AS "startupPage",
            auto_save AS "autoSave", receipt_header AS "receiptHeader",
            receipt_show_logo AS "receiptShowLogo", receipt_show_signature AS "receiptShowSignature",
            receipt_show_watermark AS "receiptShowWatermark", report_header AS "reportHeader",
            report_footer AS "reportFooter", default_report AS "defaultReport",
            tax_enabled AS "taxEnabled", tax_rate AS "taxRate",
            session_timeout_minutes AS "sessionTimeoutMinutes", pin_hash AS "pinHash",
            open_at_startup AS "openAtStartup", minimize_to_tray AS "minimizeToTray",
            global_shortcut AS "globalShortcut",
            signature_name AS "signatureName", watermark_text AS "watermarkText"
     FROM settings WHERE id = 1`,
  );
  const row = (res.rows as AppSettings[])[0];
  if (row) { appSettingsCache = row; return row; }
  return {
    language: 'en', theme: 'dark', dateFormat: 'DD/MM/YYYY',
    receiptWidth: '80mm', reportPaperSize: 'a4',
    autoPrintDebt: false, autoPrintPayment: false, autoPrintConfigured: true,
    startupPage: 'dashboard', autoSave: true,
    receiptHeader: null, receiptShowLogo: true, receiptShowSignature: false, receiptShowWatermark: false,
    reportHeader: null, reportFooter: null, defaultReport: 'customers',
    taxEnabled: false, taxRate: 0,
    sessionTimeoutMinutes: 30, pinHash: null,
    openAtStartup: false, minimizeToTray: true, globalShortcut: 'Ctrl+Shift+D',
    signatureName: null, watermarkText: null,
  };
}

export interface PdfTableColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'center' | 'right';
}

export interface ReportSection {
  title: string;
  columns: PdfTableColumn[];
  rows: Record<string, string | number>[];
  totalLabel?: string;
  totalValue?: string;
  emptyMessage?: string;
}

export interface PdfExportOptions {
  title: string;
  dateGenerated: string;
  preparedBy: string;
  fileName: string;
  paperSize: 'a4' | 'a5';
  sections: ReportSection[];
  summary?: { label: string; value: string }[];
  subtitle?: string;
  showWatermark?: boolean;
  customHeader?: string;
  customFooter?: string;
  customerInfo?: { name: string; address?: string };
}

/* ─────────────────────────────────────────────
   A4 / A5 dimensions in mm
   ───────────────────────────────────────────── */
const PAGE_DIMS = {
  a4: { w: 210, h: 297, margin: 14, padTop: 12, padBottom: 24 },
  a5: { w: 148, h: 210, margin: 10, padTop: 10, padBottom: 20 },
};

async function drawHeader(
  doc: jsPDF,
  info: BusinessInfo,
  paperSize: 'a4' | 'a5',
): Promise<number> {
  const dims = PAGE_DIMS[paperSize];
  const pw = doc.internal.pageSize.getWidth();
  const m = dims.margin;
  let y = dims.padTop;

  // Count how many business-info lines will be drawn so the header box is
  // always tall enough (previously a fixed 28mm box could be shorter than
  // the actual content, causing it to spill out of/overlap the box).
  let lineCount = 1; // slogan/address/contact/reg/owner, counted below
  if (info.slogan) lineCount++;
  if (info.address) lineCount++;
  if (info.phone || info.email || info.website) lineCount++;
  if (info.tinNumber || info.rssbNumber) lineCount++;
  if (info.showOwnerOnReports && info.ownerName) lineCount++;
  const boxH = Math.max(28, 11 + lineCount * 3.5 + 3);

  // Header box with teal border and light bg
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(m, y, pw - 2 * m, boxH, 3, 3, 'F');
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.6);
  doc.roundedRect(m, y, pw - 2 * m, boxH, 3, 3, 'S');
  doc.setLineWidth(0.2);

  // Logo on left
  if (info.logoData) {
    try {
      const { base64, format } = await resizeLogoForPdf(info.logoData);
      doc.addImage(base64, format, m + 3, y + 4, 20, 20);
    } catch { /* skip */ }
  }

  // Company name centered
  const centerX = pw / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(paperSize === 'a4' ? 18 : 14);
  doc.setTextColor(15, 118, 110);
  doc.text(info.name, centerX, y + 9, { align: 'center' });

  // Business info lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(paperSize === 'a4' ? 9 : 7);
  doc.setTextColor(71, 85, 105);
  let lineY = y + 14;
  if (info.slogan) {
    doc.setFont('helvetica', 'italic');
    doc.text(info.slogan, centerX, lineY, { align: 'center' });
    lineY += 3.5;
    doc.setFont('helvetica', 'normal');
  }
  if (info.address) { doc.text(info.address, centerX, lineY, { align: 'center' }); lineY += 3.5; }
  const contactParts = [info.phone ? `Tel: ${info.phone}` : '', info.email, info.website].filter(Boolean).join(' | ');
  if (contactParts) { doc.text(contactParts, centerX, lineY, { align: 'center' }); lineY += 3.5; }
  const regParts = [info.tinNumber ? `TIN: ${info.tinNumber}` : '', info.rssbNumber ? `RSSB: ${info.rssbNumber}` : ''].filter(Boolean).join(' | ');
  if (regParts) { doc.text(regParts, centerX, lineY, { align: 'center' }); lineY += 3.5; }
  if (info.showOwnerOnReports && info.ownerName) { doc.text(`Owner: ${info.ownerName}`, centerX, lineY, { align: 'center' }); lineY += 3.5; }

  doc.setTextColor(0, 0, 0);
  return y + boxH + 6;
}

function drawFooter(
  doc: jsPDF,
  info: BusinessInfo,
  paperSize: 'a4' | 'a5',
  customFooter?: string,
) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const dims = PAGE_DIMS[paperSize];
  const pageCount = doc.getNumberOfPages();
  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const printTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const y = pageHeight - dims.padBottom + 4;
    const m = dims.margin;

    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.3);
    doc.line(m, y, pageWidth - m, y);
    doc.setLineWidth(0.2);

    // Contact line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const addrParts = [info.address, info.phone ? `Tel: ${info.phone}` : '', info.email].filter(Boolean).join(' | ');
    if (addrParts) doc.text(addrParts, pageWidth / 2, y + 3, { align: 'center' });

    // Meta line
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('Confidential Business Document', m, y + 7);
    doc.text(`${printDate} ${printTime}`, pageWidth / 2, y + 7, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - m, y + 7, { align: 'right' });

    // Powered by
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Powered by MUD Software Company', pageWidth / 2, y + 11, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    // Custom footer text (from settings) — draw on each page after the standard footer
    if (customFooter) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(customFooter, pageWidth / 2, y + 14, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  }
}

function drawSummaryBoxes(
  doc: jsPDF,
  summary: { label: string; value: string }[],
  y: number,
  paperSize: 'a4' | 'a5',
): number {
  if (!summary.length) return y;
  const dims = PAGE_DIMS[paperSize];
  const pw = doc.internal.pageSize.getWidth();
  const m = dims.margin;
  const availableW = pw - 2 * m;
  // Fewer, wider cards give long currency values more room to breathe —
  // avoids needing to shrink text as aggressively as a 4-up grid did.
  const cols = paperSize === 'a4' ? 4 : 3;
  const gap = 3;
  const cardW = (availableW - gap * (cols - 1)) / cols;
  const cardH = paperSize === 'a4' ? 10 : 9;
  const maxTextW = cardW - 6;

  // Compute ONE shared font size for all labels, and ONE shared size for
  // all values — using the smallest size any individual card actually
  // needs. Sizing each card independently made cards in the same row show
  // different text sizes next to each other, which looked inconsistent.
  doc.setFont('helvetica', 'normal');
  let labelSize = 6;
  for (const s of summary) {
    doc.setFontSize(labelSize);
    while (labelSize > 6 && doc.getTextWidth(s.label) > maxTextW) {
      labelSize -= 1;
      doc.setFontSize(labelSize);
    }
  }
  doc.setFont('helvetica', 'bold');
  let valueSize = paperSize === 'a4' ? 8.5 : 8;
  for (const s of summary) {
    doc.setFontSize(valueSize);
    while (valueSize > 8 && doc.getTextWidth(s.value) > maxTextW) {
      valueSize -= 1;
      doc.setFontSize(valueSize);
    }
  }

  for (let i = 0; i < summary.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = m + col * (cardW + gap);
    const cy = y + row * (cardH + 3);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, 'F');
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, 'S');
    // Amber accent stripe on the left edge of each card
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(x, cy, 1.8, cardH, 0.8, 0.8, 'F');
    doc.setLineWidth(0.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(labelSize);
    doc.setTextColor(71, 85, 105);
    doc.text(summary[i].label, x + 4, cy + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(valueSize);
    doc.setTextColor(30, 64, 175);
    doc.text(summary[i].value, x + 4, cy + cardH - 2.5);
    doc.setTextColor(0, 0, 0);
  }

  const rows = Math.ceil(summary.length / cols);
  return y + rows * (cardH + 3) + 2;
}

export async function exportReportToPdf(opts: PdfExportOptions, info: BusinessInfo): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const dims = PAGE_DIMS[opts.paperSize];
  const doc = new jsPDF({ unit: 'mm', format: opts.paperSize });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = dims.margin;

  // Watermark
  if (opts.showWatermark) {
    doc.saveGraphicsState();
    doc.setTextColor(0, 0, 0);
    doc.setGState(doc.GState({ opacity: 0.06 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(opts.paperSize === 'a4' ? 60 : 40);
    doc.text(info.name, pw / 2, ph / 2, { align: 'center', angle: 30 });
    doc.restoreGraphicsState();
  }

  let y = await drawHeader(doc, info, opts.paperSize);

  // Custom header text (from settings)
  if (opts.customHeader) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(opts.customHeader, m, y);
    y += 4;
    doc.setTextColor(0, 0, 0);
  }

  // ── Report title: large, centered between header and table ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(opts.paperSize === 'a4' ? 18 : 15);
  doc.setTextColor(15, 118, 110);
  doc.text(opts.title, pw / 2, y, { align: 'center' });
  y += 3;
  doc.setDrawColor(13, 148, 136); doc.setLineWidth(0.4);
  doc.line(pw / 2 - 40, y, pw / 2 + 40, y);
  y += 6;

  // Subtitle (period info)
  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(opts.subtitle, pw / 2, y, { align: 'center' });
    y += 5;
  }
  y += 2;

  // Customer statement identity: customer name sits directly under the report title,
  // followed by the report date. Phone is intentionally omitted from reports.
  if (opts.customerInfo?.name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(opts.paperSize === 'a4' ? 12 : 10);
    doc.setTextColor(17, 24, 39);
    doc.text(opts.customerInfo.name, pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(opts.dateGenerated, pw / 2, y, { align: 'center' });
    y += 7;
    if (opts.customerInfo.address) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(opts.customerInfo.address, pw / 2, y, { align: 'center' });
      y += 5;
    }
  } else {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(opts.dateGenerated, m, y);
    y += 6;
  }
  doc.setTextColor(0, 0, 0);

  // Summary boxes
  if (opts.summary && opts.summary.length) {
    y = drawSummaryBoxes(doc, opts.summary, y, opts.paperSize);
    y += 3;
  }

  // Sections
  for (const section of opts.sections) {
    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text(section.title, m, y);
    y += 3;

    const tableY = y;
    const availW = pw - 2 * m;
    // Assign each column a proportional share of the available page width —
    // narrow for short/numeric fields, wider for free-text fields — so a
    // long value wraps INSIDE its cell instead of stretching the whole
    // table wider and pushing the report onto extra pages.
    const weightFor = (key: string): number => {
      const k = key.toLowerCase();
      if (k === 'no') return 0.5;
      if (k.includes('date')) return 1.1;
      if (k === 'quantity' || k === 'qty') return 0.7;
      if (k.includes('description') || k.includes('item') || k.includes('customer') || k.includes('name') || k.includes('address') || k.includes('activity') || k.includes('type')) return 1.7;
      return 1.1; // amounts / debit / credit / balance / prices / other
    };
    const weights = section.columns.map((c) => weightFor(String(c.dataKey)));
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const columnStyles: Record<number, { halign: 'left' | 'center' | 'right'; cellWidth: number }> = {};
    section.columns.forEach((c, i) => {
      columnStyles[i] = { halign: c.align || 'left', cellWidth: (weights[i] / totalWeight) * availW };
    });

    autoTable(doc, {
      startY: tableY,
      head: [section.columns.map((c) => c.header)],
      body: section.rows.map((r) => section.columns.map((c) => String(r[c.dataKey] ?? ''))),
      styles: {
        fontSize: opts.paperSize === 'a4' ? 8.5 : 7.5,
        cellPadding: opts.paperSize === 'a4' ? 2 : 1.5,
        lineColor: [170, 170, 170],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [219, 234, 254],
        textColor: [30, 64, 175],
        fontStyle: 'bold',
        lineWidth: 0.3,
        lineColor: [37, 99, 235],
        fontSize: opts.paperSize === 'a4' ? 8.5 : 7.5,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles,
      tableWidth: availW,
      margin: { left: m, right: m, bottom: dims.padBottom + 4 },
    });

    y = (doc.lastAutoTable?.finalY ?? tableY) + 4;

    if (section.totalLabel && section.totalValue) {
      const boxW = 76;
      const boxH = 9;
      const boxX = pw - m - boxW;
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(boxX, y - 5, boxW, boxH, 1.5, 1.5, 'F');
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, y - 5, boxW, boxH, 1.5, 1.5, 'S');
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(boxX, y - 5, 2, boxH, 1, 1, 'F');
      doc.setLineWidth(0.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${section.totalLabel}:`, boxX + 5, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      doc.text(section.totalValue, pw - m - 4, y + 1, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 8;
    }

    y += 4;

    // Page break check
    if (y > ph - dims.padBottom - 10) {
      doc.addPage();
      y = dims.padTop + 4;
    }
  }

  // "Prepared by" — right after the report content ends, with a small gap
  // (not glued to the last table row, and not pinned down at the page's
  // physical bottom margin/footer).
  if (y > ph - dims.padBottom - 16) {
    doc.addPage();
    y = dims.padTop + 4;
  }
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Prepared by: ${opts.preparedBy}`, m, y);
  doc.setTextColor(0, 0, 0);

  drawFooter(doc, info, opts.paperSize, opts.customFooter);
  if (isTauri()) {
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    const path = await saveFileDialog(opts.fileName, [{ name: 'PDF', extensions: ['pdf'] }]);
    if (!path) return;
    await writeFile(path, bytes);
  } else {
    doc.save(opts.fileName);
  }
}

export async function exportReportToExcel(
  title: string,
  columns: PdfTableColumn[],
  rows: Record<string, string | number>[],
  totalLabel: string,
  totalValue: string,
  fileName: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const headerRow = columns.map((c) => c.header);
  const dataRows = rows.map((r) => columns.map((c) => r[c.dataKey] ?? ''));
  const aoa = [
    [title],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    headerRow,
    ...dataRows,
    [],
    [totalLabel, totalValue],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  if (isTauri()) {
    const output = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const bytes = output instanceof Uint8Array ? output : new Uint8Array(output as ArrayBuffer);
    const path = await saveFileDialog(fileName, [{ name: 'Excel', extensions: ['xlsx'] }]);
    if (!path) return;
    await writeFile(path, bytes);
  } else {
    XLSX.writeFile(wb, fileName);
  }
}

export interface PrintOptions {
  title: string;
  dateGenerated: string;
  preparedBy: string;
  businessName: string;
  businessContact: string;
  businessInfo?: BusinessInfo;
  logoData?: string | null;
  showWatermark?: boolean;
  paperSize: 'a4' | 'a5';
  subtitle?: string;
  sections: ReportSection[];
  summary?: { label: string; value: string }[];
  customHeader?: string;
  customFooter?: string;
  customerInfo?: { name: string; address?: string };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReportHtml(opts: PrintOptions): string {
  const info = opts.businessInfo;
  const isA5 = opts.paperSize === 'a5';
  const padTop = isA5 ? '10mm' : '12mm';
  const padSide = isA5 ? '10mm' : '14mm';
  // Extra-generous bottom margin: this must fully contain the fixed
  // per-page footer (border + 3 lines of text) PLUS a safety gap, so the
  // browser's automatic page pagination never lets a table row render into
  // the same space the footer occupies on every page.
  const padBottom = isA5 ? '22mm' : '24mm';

  const reportLabels = getReportLanguageLabels();
  const logoHtml = `<img src="${opts.logoData || '/icon.png'}" class="ph-logo" alt="Ikaze Ledger" />`;

  const bizLines: string[] = [];
  if (info) {
    if (info.slogan) bizLines.push(`<p class="ph-slogan">${escapeHtml(info.slogan)}</p>`);
    if (info.address) bizLines.push(`<p class="ph-line">${escapeHtml(info.address)}</p>`);
    const contact: string[] = [];
    if (info.phone) contact.push(`Tel: ${escapeHtml(info.phone)}`);
    if (info.email) contact.push(escapeHtml(info.email));
    if (info.website) contact.push(escapeHtml(info.website));
    if (contact.length) bizLines.push(`<p class="ph-line">${contact.join(' &nbsp;|&nbsp; ')}</p>`);
    const reg: string[] = [];
    if (info.tinNumber) reg.push(`TIN: ${escapeHtml(info.tinNumber)}`);
    if (info.rssbNumber) reg.push(`RSSB: ${escapeHtml(info.rssbNumber)}`);
    if (reg.length) bizLines.push(`<p class="ph-line">${reg.join(' &nbsp;|&nbsp; ')}</p>`);
    if (info.showOwnerOnReports && info.ownerName) bizLines.push(`<p class="ph-line">Owner: ${escapeHtml(info.ownerName)}</p>`);
  } else {
    bizLines.push(`<p class="ph-line">${escapeHtml(opts.businessContact)}</p>`);
  }

  const summaryHtml = opts.summary && opts.summary.length
    ? `<div class="summary">${opts.summary.map((s) => `<div class="sum-card"><span class="sum-label">${escapeHtml(s.label)}</span><span class="sum-val">${escapeHtml(s.value)}</span></div>`).join('')}</div>`
    : '';

  const watermarkHtml = opts.showWatermark ? `<div class="watermark">${escapeHtml(opts.businessName)}</div>` : '';

  const sectionsHtml = opts.sections.map((section) => {
    const rowsHtml = section.rows.length > 0
      ? section.rows.map((r) =>
          `<tr>${section.columns.map((c) => `<td class="${c.align === 'center' ? 'c' : c.align === 'right' ? 'r' : ''}">${escapeHtml(String(r[c.dataKey] ?? ''))}</td>`).join('')}</tr>`
        ).join('')
      : `<tr><td colspan="${section.columns.length}" class="c empty">${escapeHtml(section.emptyMessage || 'No data')}</td></tr>`;

    const totalHtml = section.totalLabel && section.totalValue
      ? `<div class="total-bar"><div class="total-box"><span class="lbl">${escapeHtml(section.totalLabel)}</span><span class="val">${escapeHtml(section.totalValue)}</span></div></div>`
      : '';

    return `<div class="section">
      <h3 class="section-title">${escapeHtml(section.title)}</h3>
      <table class="rpt-table">
        <thead><tr>${section.columns.map((c) => `<th class="${c.align === 'center' ? 'c' : c.align === 'right' ? 'r' : 'l'}">${escapeHtml(c.header)}</th>`).join('')}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${totalHtml}
    </div>`;
  }).join('');

  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const printTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const contactLine = info
    ? [info.address ? escapeHtml(info.address) : '', info.phone ? `Tel: ${escapeHtml(info.phone)}` : '', info.email ? escapeHtml(info.email) : ''].filter(Boolean).join(' &nbsp;|&nbsp; ')
    : escapeHtml(opts.businessContact);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title>
  <style>
    @page{margin:${padTop} ${padSide} ${padBottom} ${padSide};size:${isA5 ? 'A5' : 'A4'} portrait}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#111;background:#fff;position:relative}
    .page{width:100%;min-height:${isA5 ? '178mm' : '261mm'};position:relative;page-break-after:always;padding-bottom:4mm}
    .page:last-child{page-break-after:auto}
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:${isA5 ? '50px' : '72px'};font-weight:bold;color:#000;opacity:0.06;white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:2px}
    .content{position:relative;z-index:1}

    /* Professional Header */
    .ph-wrap{border:2px solid #0d9488;border-radius:8px;overflow:hidden;margin-bottom:6px}
    .ph-inner{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f0fdfa}
    .ph-logo{width:${isA5 ? '40px' : '50px'};height:${isA5 ? '40px' : '50px'};object-fit:contain;border-radius:6px;flex-shrink:0;border:1px solid #0d9488}
    .ph-biz{flex:1;text-align:center}
    .ph-name{font-size:${isA5 ? '16px' : '20px'};margin:0;font-weight:bold;letter-spacing:0.3px;color:#0f766e}
    .ph-slogan{font-size:8px;font-style:italic;margin:1px 0 2px;color:#475569}
    .ph-line{font-size:8px;margin:0.5px 0;color:#475569}
    .ph-doc{flex:0 0 auto;text-align:center;min-width:${isA5 ? '90px' : '120px'}}

    /* Meta row */
    .rpt-title{text-align:center;font-size:${isA5 ? '17px' : '21px'};font-weight:bold;color:#0f766e;margin:4mm 0 2mm;letter-spacing:0.5px}
    .rpt-subtitle{text-align:center;font-size:11px;color:#475569;margin-bottom:3mm}
    .rpt-meta{font-size:11px;color:#666;margin-bottom:4mm;padding:0 2px}
    .customer-identity{display:flex;align-items:center;gap:8px;border:1px solid #0d9488;border-radius:4px;background:#f0fdfa;padding:4px 7px;margin:4px 0 6px;font-size:9px;color:#111}
    .customer-identity strong{color:#0f766e}.customer-identity small{color:#475569}

    /* Summary cards */
    .summary{display:flex;flex-wrap:wrap;gap:3px;margin:3px 0 5px}
    .sum-card{flex:1;min-width:${isA5 ? '82px' : '102px'};border:1px solid #2563eb;border-left:2px solid #f59e0b;border-radius:4px;padding:3px 5px;background:#eff6ff}
    .sum-label{display:block;font-size:6.5px;color:#475569;text-transform:uppercase;letter-spacing:0.25px}
    .sum-val{display:block;font-size:${isA5 ? '8px' : '9px'};font-weight:bold;color:#1e40af;margin-top:1px;word-break:break-word}

    /* Sections */
    .section{margin-bottom:12px;break-inside:auto}
    .section-title{font-size:${isA5 ? '12px' : '14px'};font-weight:bold;color:#0f766e;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #d1d5db}

    /* Table */
    table.rpt-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:${isA5 ? '9px' : '10px'}}
    table.rpt-table{page-break-inside:auto;break-inside:auto}
    table.rpt-table thead{display:table-header-group}
    table.rpt-table tbody{display:table-row-group}
    table.rpt-table th{border:1px solid #2563eb;padding:5px 5px;font-weight:bold;background:#dbeafe;color:#1e40af;letter-spacing:0.3px;word-wrap:break-word;overflow-wrap:break-word}
    table.rpt-table th.l{text-align:left}
    table.rpt-table th.c{text-align:center}
    table.rpt-table th.r{text-align:right}
    table.rpt-table td{border:1px solid #bbb;padding:4px 5px;text-align:left;word-wrap:break-word;overflow-wrap:break-word}
    table.rpt-table td.c{text-align:center}
    table.rpt-table td.r{text-align:right}
    table.rpt-table tr{page-break-inside:avoid;break-inside:avoid}table.rpt-table td,table.rpt-table th{position:relative}
    table.rpt-table tr:nth-child(even){background:#f8fafc}
    table.rpt-table td.empty{color:#999;text-align:center;padding:12px;font-style:italic}

    /* Total bar */
    .total-bar{margin-top:4px;display:flex;justify-content:flex-end}
    .total-bar .total-box{border:1px solid #2563eb;border-left:4px solid #f59e0b;border-radius:4px;padding:5px 16px;background:#eff6ff;display:inline-block}
    .total-bar .lbl{font-size:10px;color:#475569;margin-right:8px}
    .total-bar .val{font-size:13px;font-weight:bold;color:#1e40af}

    /* Prepared-by line — right after the report content, not glued to the
       page's fixed bottom-margin footer */
    .prepared-by{font-size:10px;color:#475569;margin-top:6px}

    /* Footer */
    .pf-wrap{position:fixed;left:${padSide};right:${padSide};bottom:3mm;margin:0;z-index:999;background:#fff;page-break-inside:avoid;break-inside:avoid;width:auto;height:${isA5 ? '14mm' : '15mm'};overflow:hidden}
    .pf-inner{border-top:1px solid #2563eb;padding-top:3px;background:#fff}
    .pf-contact{text-align:center;font-size:8px;color:#475569;margin-bottom:2px}
    .pf-meta{display:flex;justify-content:space-between;font-size:7px;color:#666}
    .pf-powered{text-align:center;font-size:8px;font-weight:bold;color:#1e40af;margin-top:2px}

    @media print{html,body{background:#fff!important;color:#111!important;color-scheme:light!important}.page{margin:0;min-height:0;padding-bottom:4mm}.pf-wrap{position:fixed!important;left:${padSide}!important;right:${padSide}!important;bottom:3mm!important;margin:0!important;background:#fff!important;z-index:999!important;page-break-inside:avoid;break-inside:avoid}.watermark{position:fixed!important}}
  </style></head><body>
  ${watermarkHtml}
  <div class="page">
    <div class="content">
      <div class="ph-wrap"><div class="ph-inner">
        ${logoHtml}
        <div class="ph-biz">
          <h1 class="ph-name">${escapeHtml(opts.businessName)}</h1>
          ${bizLines.join('')}
        </div>
      </div></div>

      <div class="rpt-title">${escapeHtml(opts.title)}</div>
      ${opts.subtitle ? `<div class="rpt-subtitle">${escapeHtml(opts.subtitle)}</div>` : ''}
      ${opts.customHeader ? `<div class="rpt-custom-header" style="font-size:9px;font-style:italic;color:#475569;margin-bottom:4px">${escapeHtml(opts.customHeader)}</div>` : ''}

      <div class="rpt-meta">
        <span>${escapeHtml(opts.dateGenerated)}</span>
      </div>
      ${opts.customerInfo?.name ? `<div class="customer-identity"><strong>${escapeHtml(opts.customerInfo.name)}</strong><small>${escapeHtml(opts.dateGenerated)}</small>${opts.customerInfo.address ? `<small>${escapeHtml(opts.customerInfo.address)}</small>` : ''}</div>` : `<div class="rpt-meta"><span>${escapeHtml(opts.dateGenerated)}</span></div>`}

      ${summaryHtml}

      ${sectionsHtml}

      <div class="prepared-by">Prepared by: ${escapeHtml(opts.preparedBy)}</div>
    </div>
    <div class="pf-wrap"><div class="pf-inner">
      <div class="pf-contact">${contactLine}</div>
      <div class="pf-meta">
        <span>${reportLabels.confidential}</span>
        <span>${printDate} ${printTime}</span>
        <span>Page 1 of 1</span>
      </div>
      <div class="pf-powered">${reportLabels.powered}</div>
      ${opts.customFooter ? `<div style="text-align:center;font-size:7px;font-style:italic;color:#999;margin-top:2px">${escapeHtml(opts.customFooter)}</div>` : ''}
    </div></div>
  </div>
  </body></html>`;
}

export function printReport(opts: PrintOptions): void {
  printHtmlDocument(buildReportHtml(opts));
}

export function formatForReport(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return formatCurrency(value);
  return String(value);
}

// Re-export for backwards compat


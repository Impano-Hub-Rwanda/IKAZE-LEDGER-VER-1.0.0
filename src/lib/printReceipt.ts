import { getDb } from './database';
import { getBusinessInfo, getAppSettings } from './exportReport';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { printHtmlDocument } from './tauri';
import type { DebtItem } from '../types/debt';

export async function loadDebtReceiptData(debtId: number, issuedBy: string): Promise<DebtReceiptData | null> {
  const db = getDb();
  const [info, app] = await Promise.all([getBusinessInfo(), getAppSettings()]);
  const debtRes = await db.query<{
    id: number; created_at: string; total_amount: number; paid_amount: number;
    customer_name: string; customer_phone: string | null; customer_tin: string | null;
    customer_address: string | null;
  }>(
    `SELECT d.id, d.created_at, d.total_amount, d.paid_amount,
            c.full_name AS customer_name, c.phone AS customer_phone, c.tin_number AS customer_tin,
            c.address AS customer_address
     FROM debts d JOIN customers c ON c.id = d.customer_id WHERE d.id = $1`,
    [debtId],
  );
  const debt = (debtRes.rows as typeof debtRes.rows)[0];
  if (!debt) return null;
  const itemsRes = await db.query<DebtItem>('SELECT * FROM debt_items WHERE debt_id = $1 ORDER BY id', [debtId]);
  return {
    businessName: info.name,
    businessInfo: info,
    receiptWidth: app.receiptWidth,
    receiptNo: `RCP-${String(debt.id).padStart(4, '0')}`,
    deliveryNoteNo: `DN-${String(debt.id).padStart(4, '0')}`,
    customerName: debt.customer_name,
    customerPhone: debt.customer_phone,
    customerTin: debt.customer_tin,
    customerAddress: debt.customer_address,
    items: itemsRes.rows as DebtItem[],
    total: Number(debt.total_amount),
    paid: Number(debt.paid_amount),
    remaining: Number(debt.total_amount) - Number(debt.paid_amount),
    date: debt.created_at,
    issuedBy,
    logoData: info.logoData,
    taxRate: app.taxRate,
    taxEnabled: app.taxEnabled,
    receiptHeader: app.receiptHeader,
    receiptShowLogo: app.receiptShowLogo,
    receiptShowSignature: app.receiptShowSignature,
    receiptShowWatermark: app.receiptShowWatermark,
    watermarkText: app.watermarkText,
    signatureName: app.signatureName,
  };
}

export async function loadPaymentReceiptData(
  paymentId: number,
  methodLabels: Record<string, string>,
  receivedBy: string,
): Promise<PaymentReceiptData | null> {
  const db = getDb();
  const [info, app] = await Promise.all([getBusinessInfo(), getAppSettings()]);
  const res = await db.query<{
    id: number; paid_at: string; amount: number; debt_id: number;
    method: string; customer_name: string; customer_tin: string | null; debt_total: number; debt_paid: number;
  }>(
    `SELECT p.id, p.paid_at, p.amount, p.debt_id, p.method,
            c.full_name AS customer_name, c.tin_number AS customer_tin,
            d.total_amount AS debt_total, d.paid_amount AS debt_paid
     FROM payments p
     JOIN debts d ON d.id = p.debt_id
     JOIN customers c ON c.id = d.customer_id
     WHERE p.id = $1`,
    [paymentId],
  );
  const row = (res.rows as typeof res.rows)[0];
  if (!row) return null;
  return {
    businessName: info.name,
    businessInfo: info,
    receiptWidth: app.receiptWidth,
    receiptNo: `RCP-${String(row.debt_id).padStart(4, '0')}`,
    paymentReceiptNo: `RCP-${String(row.id).padStart(4, '0')}`,
    customerName: row.customer_name,
    customerTin: row.customer_tin,
    debtNo: `DEBT-${String(row.debt_id).padStart(4, '0')}`,
    amountPaid: Number(row.amount),
    remaining: Number(row.debt_total) - Number(row.debt_paid),
    method: methodLabels[row.method] ?? row.method,
    date: row.paid_at,
    receivedBy,
    logoData: info.logoData,
    receiptHeader: app.receiptHeader,
    receiptShowLogo: app.receiptShowLogo,
    receiptShowSignature: app.receiptShowSignature,
    receiptShowWatermark: app.receiptShowWatermark,
    watermarkText: app.watermarkText,
    signatureName: app.signatureName,
  };
}

interface BusinessReceiptInfo {
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
  showOwnerOnReceipts: boolean;
}

export interface DebtReceiptData {
  businessName: string;
  businessInfo: BusinessReceiptInfo;
  receiptWidth: '58mm' | '80mm';
  receiptNo: string;
  deliveryNoteNo: string;
  customerName: string;
  customerPhone: string | null;
  customerTin: string | null;
  customerAddress: string | null;
  items: DebtItem[];
  total: number;
  paid: number;
  remaining: number;
  date: string;
  issuedBy: string;
  logoData?: string | null;
  taxRate?: number;
  taxEnabled?: boolean;
  receiptHeader?: string | null;
  receiptShowLogo?: boolean;
  receiptShowSignature?: boolean;
  receiptShowWatermark?: boolean;
  watermarkText?: string | null;
  signatureName?: string | null;
}

export interface PaymentReceiptData {
  businessName: string;
  businessInfo: BusinessReceiptInfo;
  receiptWidth: '58mm' | '80mm';
  receiptNo: string;
  customerName: string;
  customerTin: string | null;
  debtNo: string;
  paymentReceiptNo: string;
  amountPaid: number;
  remaining: number;
  method: string;
  date: string;
  receivedBy: string;
  logoData?: string | null;
  receiptHeader?: string | null;
  receiptShowLogo?: boolean;
  receiptShowSignature?: boolean;
  receiptShowWatermark?: boolean;
  watermarkText?: string | null;
  signatureName?: string | null;
}

export type PrintFormat = 'receipt' | 'a5' | 'a4';

// ──────────────────────────────────────────────
// Thermal receipt styles (58mm / 80mm)
// ──────────────────────────────────────────────
function receiptStyles(width: '58mm' | '80mm'): string {
  const w = width === '58mm' ? '58mm' : '80mm';
  const pad = width === '58mm' ? '8px' : '12px';
  const bizSize = width === '58mm' ? '15px' : '19px';
  const lineSize = width === '58mm' ? '10px' : '11px';
  const infoSize = width === '58mm' ? '11px' : '12px';
  const itemSize = width === '58mm' ? '10px' : '11px';
  const sumSize = width === '58mm' ? '12px' : '13px';
  const bigSize = width === '58mm' ? '14px' : '16px';
  const signSize = width === '58mm' ? '10px' : '11px';
  const footSize = width === '58mm' ? '9px' : '10px';
  const docTitleSize = width === '58mm' ? '13px' : '15px';
  const docNoSize = width === '58mm' ? '11px' : '12px';
  return `
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      width:${w};padding:${pad};color:#000;background:#fff;
      font-family:'Lucida Console','Lucida Sans Typewriter','Consolas','Courier New',monospace;
      font-size:${infoSize};line-height:1.5;position:relative;overflow:hidden;
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
    }
    .watermark{
      position:absolute;top:45%;left:50%;
      transform:translate(-50%,-50%) rotate(-28deg);
      font-size:${width === '58mm' ? '32px' : '44px'};font-weight:bold;color:#000;
      opacity:0.10;white-space:nowrap;pointer-events:none;z-index:0;
    }
    .content{position:relative;z-index:1}
    .biz{text-align:center;margin-bottom:2px}
    .biz-logo{display:block;margin:0 auto 4px;max-height:48px;max-width:48px}
    .biz h1{font-size:${bizSize};font-weight:bold;margin:0;letter-spacing:0.3px}
    .biz-slogan{font-size:${lineSize};font-style:italic;margin:2px 0}
    .biz-line{font-size:${lineSize};margin:1px 0;color:#222}
    .divider{border-bottom:1px dashed #000;margin:6px 0}
    .divider.thick{border-bottom:2px dashed #000;margin:8px 0}
    .doc-title-block{text-align:center;margin:6px 0 4px}
    .doc-title-block .doc-type{font-size:${docTitleSize};font-weight:bold;letter-spacing:1px;text-transform:uppercase}
    .doc-title-block .doc-no{font-size:${docNoSize};font-weight:bold;margin-top:1px}
    .info-table{width:100%;border-collapse:collapse;font-size:${infoSize}}
    .info-table tr td{padding:1.5px 0;vertical-align:top}
    .info-table tr td.lbl{text-align:left;font-weight:bold;width:42%;white-space:nowrap}
    .info-table tr td.val{text-align:right}
    table.items{width:100%;border-collapse:collapse;font-size:${itemSize};margin:2px 0}
    table.items th{
      border-bottom:1px solid #000;padding:4px 1px;font-weight:bold;
      text-transform:uppercase;letter-spacing:0.2px;
    }
    table.items th.c,table.items td.c{text-align:center}
    table.items th.r,table.items td.r{text-align:right}
    table.items th.l,table.items td.l{text-align:left}
    table.items th.qty,table.items td.qty{width:10%}
    table.items th.price,table.items td.price{width:24%}
    table.items th.tot,table.items td.tot{width:24%}
    table.items th.item{width:42%}
    table.items td{border-bottom:1px dotted #bbb;padding:4px 1px}
    table.items td.item-name{font-weight:bold}
    .item-type{font-size:${width === '58mm' ? '7px' : '8px'};color:#666}
    .sum{margin-top:4px;padding-top:4px;border-top:2px dashed #000}
    .sum-row{display:flex;justify-content:space-between;font-size:${sumSize};margin:2px 0}
    .sum-row.bold{font-weight:bold}
    .sum-row.big{font-size:${bigSize};font-weight:bold;margin-top:4px;padding-top:3px;border-top:1px solid #000}
    .sign{margin-top:28px;display:flex;justify-content:space-between;font-size:${signSize}}
    .sign div{width:46%;text-align:center}
    .sign .line{border-top:1px solid #000;margin-top:22px;padding-top:2px}
    .sign .sign-name{font-weight:bold;font-size:${signSize};margin-top:2px}
    .sign .sign-role{font-size:${width === '58mm' ? '7px' : '8px'};color:#444;font-weight:bold}
    .thank-you{text-align:center;font-size:${sumSize};font-weight:bold;margin:10px 0 6px}
    .footer-contact{text-align:center;font-size:${footSize};color:#666;margin-top:4px;line-height:1.6}
    .footer-powered{text-align:center;font-size:${footSize};color:#999;margin-top:6px;border-top:1px dashed #ccc;padding-top:4px}
    @media print{
      body{width:${w};padding:${pad}}
      @page{margin:0;size:${w} auto}
    }
  `;
}

function buildBusinessHeader(info: BusinessReceiptInfo, showLogo = true, receiptHeader?: string | null): string {
  const logoHtml = (showLogo && info.logoData)
    ? `<img src="${info.logoData}" class="biz-logo" alt="logo" />`
    : '';
  const headerHtml = receiptHeader ? `<p class="biz-line" style="font-weight:bold;font-size:${info.name ? '9px' : '10px'}">${esc(receiptHeader)}</p>` : '';
  const lines: string[] = [];
  if (info.slogan) lines.push(`<p class="biz-slogan">${esc(info.slogan)}</p>`);
  if (info.address) lines.push(`<p class="biz-line">${esc(info.address)}</p>`);
  const contact: string[] = [];
  if (info.phone) contact.push(`Tel: ${esc(info.phone)}`);
  if (info.email) contact.push(esc(info.email));
  if (contact.length) lines.push(`<p class="biz-line">${contact.join(' | ')}</p>`);
  if (info.website) lines.push(`<p class="biz-line">${esc(info.website)}</p>`);
  const reg: string[] = [];
  if (info.tinNumber) reg.push(`TIN: ${esc(info.tinNumber)}`);
  if (info.rssbNumber) reg.push(`RSSB: ${esc(info.rssbNumber)}`);
  if (reg.length) lines.push(`<p class="biz-line">${reg.join(' | ')}</p>`);
  if (info.showOwnerOnReceipts && info.ownerName) {
    lines.push(`<p class="biz-line">Owner: ${esc(info.ownerName)}</p>`);
  }
  return `<div class="biz">${logoHtml}<h1>${esc(info.name)}</h1>${headerHtml}${lines.join('')}</div>`;
}

function buildReceiptFooter(info: BusinessReceiptInfo): string {
  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const printTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const addrParts: string[] = [];
  if (info.address) addrParts.push(esc(info.address));
  if (info.phone) addrParts.push(`Tel: ${esc(info.phone)}`);
  if (info.email) addrParts.push(esc(info.email));
  const contactLine = addrParts.length ? `<div class="footer-contact">${addrParts.join(' | ')}</div>` : '';
  return `${contactLine}
    <div class="footer-powered">Printed: ${printDate} ${printTime} &nbsp;|&nbsp; Page 1 of 1 &nbsp;|&nbsp; Powered by MUD Software</div>`;
}

// ──────────────────────────────────────────────
// Thermal receipt HTML
// ──────────────────────────────────────────────
export function buildDebtReceiptHtml(d: DebtReceiptData, showWatermark = false): string {
  const itemsHtml = d.items
    .map((it, i) => {
      const typeLabel = it.item_type === 'service' ? 'SERVICE' : 'PRODUCT';
      return `<tr>
        <td class="l item item-name">${i + 1}. ${esc(it.product_name)}<br><span class="item-type">[${typeLabel}]</span></td>
        <td class="c qty">${it.quantity}</td>
        <td class="r price">${formatCurrency(Number(it.unit_price))}</td>
        <td class="r tot">${formatCurrency(Number(it.subtotal))}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Debt Receipt ${esc(d.receiptNo)}</title>
  <style>${receiptStyles(d.receiptWidth)}</style></head><body>
  ${showWatermark ? `<div class="watermark">${esc(d.watermarkText || d.businessName)}</div>` : ''}
  <div class="content">
    ${buildBusinessHeader(d.businessInfo, d.receiptShowLogo ?? true, d.receiptHeader)}
    <div class="divider thick"></div>
    <div class="doc-title-block">
      <div class="doc-type">Debt Receipt</div>
      <div class="doc-no">${esc(d.receiptNo)}</div>
    </div>
    <div class="divider"></div>
    <table class="info-table">
      <tr><td class="lbl">Date:</td><td class="val">${esc(formatDate(d.date))}</td></tr>
      <tr><td class="lbl">Customer:</td><td class="val">${esc(d.customerName)}</td></tr>
      ${d.customerPhone ? `<tr><td class="lbl">Phone:</td><td class="val">${esc(d.customerPhone)}</td></tr>` : ''}
      ${d.customerTin ? `<tr><td class="lbl">TIN:</td><td class="val">${esc(d.customerTin)}</td></tr>` : ''}
    </table>
    <div class="divider"></div>
    <table class="items">
      <thead><tr><th class="l item">Item</th><th class="c qty">Qty</th><th class="r price">Price</th><th class="r tot">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="sum">
      <div class="sum-row bold"><span>TOTAL:</span><span>${formatCurrency(d.total)}</span></div>
      <div class="sum-row"><span>Paid:</span><span>${formatCurrency(d.paid)}</span></div>
      ${d.taxEnabled && d.taxRate ? `<div class="sum-row"><span>Tax (${d.taxRate}%):</span><span>${formatCurrency(d.total * d.taxRate / 100)}</span></div>` : ''}
      <div class="sum-row big"><span>BALANCE DUE:</span><span>${formatCurrency(d.remaining)}</span></div>
    </div>
    ${d.receiptShowSignature === false ? '' : `<div class="sign">
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">Issued By</div>
        <div class="sign-name">${esc(d.signatureName || d.issuedBy)}</div>
      </div>
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">Customer Signature</div>
        <div class="sign-name">${esc(d.customerName)}</div>
      </div>
    </div>`}
    <div class="divider"></div>
    ${buildReceiptFooter(d.businessInfo)}
  </div>
  </body></html>`;
}

export function buildPaymentReceiptHtml(d: PaymentReceiptData, showWatermark = false): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${esc(d.paymentReceiptNo)}</title>
  <style>${receiptStyles(d.receiptWidth)}</style></head><body>
  ${showWatermark ? `<div class="watermark">${esc(d.watermarkText || d.businessName)}</div>` : ''}
  <div class="content">
    ${buildBusinessHeader(d.businessInfo, d.receiptShowLogo ?? true, d.receiptHeader)}
    <div class="divider thick"></div>
    <div class="doc-title-block">
      <div class="doc-type">Payment Receipt</div>
      <div class="doc-no">${esc(d.paymentReceiptNo)}</div>
    </div>
    <div class="divider"></div>
    <table class="info-table">
      <tr><td class="lbl">Date:</td><td class="val">${esc(formatDate(d.date))}</td></tr>
      <tr><td class="lbl">Customer:</td><td class="val">${esc(d.customerName)}</td></tr>
      ${d.customerTin ? `<tr><td class="lbl">TIN:</td><td class="val">${esc(d.customerTin)}</td></tr>` : ''}
      <tr><td class="lbl">Debt No:</td><td class="val">${esc(d.debtNo)}</td></tr>
      <tr><td class="lbl">Method:</td><td class="val">${esc(d.method)}</td></tr>
    </table>
    <div class="divider"></div>
    <div class="sum">
      <div class="sum-row big" style="justify-content:center;font-size:${d.receiptWidth === '58mm' ? '14px' : '18px'}"><span>AMOUNT PAID</span></div>
      <div class="sum-row big" style="justify-content:center;font-size:${d.receiptWidth === '58mm' ? '16px' : '20px'}"><span>${formatCurrency(d.amountPaid)}</span></div>
    </div>
    <div class="divider"></div>
    <div class="sum-row bold"><span>Remaining Balance:</span><span>${formatCurrency(d.remaining)}</span></div>
    ${d.receiptShowSignature === false ? '' : `<div class="sign">
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">Issued By</div>
        <div class="sign-name">${esc(d.signatureName || d.receivedBy)}</div>
      </div>
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">Customer Signature</div>
        <div class="sign-name">${esc(d.customerName)}</div>
      </div>
    </div>`}
    <div class="divider"></div>
    ${buildReceiptFooter(d.businessInfo)}
  </div>
  </body></html>`;
}

// ──────────────────────────────────────────────
// A4 / A5 page styles
// ──────────────────────────────────────────────
function pageStyles(size: 'a4' | 'a5'): string {
  const dims = size === 'a4'
    ? { w: '210mm', h: '297mm', pad: '14mm 14mm 22mm 14mm', fs: '11px' }
    : { w: '148mm', h: '210mm', pad: '10mm 10mm 16mm 10mm', fs: '10px' };
  return `
    @page { margin: ${dims.pad}; size: ${size === 'a4' ? 'A4' : 'A5'}; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${dims.fs}; color: #111; background: #fff; }
    .page { width: 100%; min-height: ${size === 'a4' ? '261mm' : '184mm'}; position: relative; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: ${size === 'a4' ? '80px' : '56px'}; font-weight: bold; color: #000; opacity: 0.06; white-space: nowrap; pointer-events: none; z-index: 0; letter-spacing: 3px; }
    .content { position: relative; z-index: 1; }

    /* Company header — no title badge */
    .ph-wrap { border: 2px solid #0d9488; border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
    .ph-inner { display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: #f0fdfa; }
    .ph-logo { width: ${size === 'a4' ? '56px' : '44px'}; height: ${size === 'a4' ? '56px' : '44px'}; object-fit: contain; border-radius: 8px; flex-shrink: 0; border: 1px solid #0d9488; }
    .ph-biz { flex: 1; text-align: center; }
    .ph-name { font-size: ${size === 'a4' ? '20px' : '16px'}; font-weight: bold; color: #0f766e; letter-spacing: 0.3px; }
    .ph-slogan { font-size: 10px; font-style: italic; color: #475569; margin: 1px 0 2px; }
    .ph-line { font-size: 10px; color: #475569; margin: 0.5px 0; }

    /* Document title block — centered between header and customer info */
    .doc-title-block { text-align: center; margin: 10px 0 8px; }
    .doc-title-block .doc-type {
      font-size: ${size === 'a4' ? '18px' : '15px'};
      font-weight: bold;
      color: #0f766e;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .doc-title-block .doc-no {
      font-size: ${size === 'a4' ? '12px' : '11px'};
      font-weight: bold;
      color: #334155;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    .doc-title-divider { border: none; border-top: 1px solid #0d9488; margin: 8px 0; }

    .doc-meta { display: flex; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin: 8px 0; background: #f8fafc; }
    .doc-meta table { font-size: ${dims.fs}; }
    .doc-meta table td { padding: 2px 6px 2px 0; vertical-align: top; }
    .doc-meta table td.lbl { font-weight: bold; white-space: nowrap; color: #475569; }

    table.doc-items { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: ${dims.fs}; margin: 6px 0; }
    table.doc-items th { border: 1px solid #2563eb; padding: 5px 4px; font-weight: bold; background: #dbeafe; color: #1e40af; text-align: center; word-wrap: break-word; overflow-wrap: break-word; }
    table.doc-items th.l { text-align: left; }
    table.doc-items th.r { text-align: right; }
    table.doc-items td { border: 1px solid #888; padding: 4px 4px; word-wrap: break-word; overflow-wrap: break-word; }
    table.doc-items td.c { text-align: center; }
    table.doc-items td.r { text-align: right; }
    table.doc-items tr { page-break-inside: avoid; break-inside: avoid; }
    table.doc-items tr:nth-child(even) td { background: #f9f9f9; }

    .doc-totals { margin-top: 8px; margin-left: auto; width: ${size === 'a4' ? '240px' : '200px'}; border: 1px solid #888; page-break-inside: avoid; break-inside: avoid; }
    .doc-totals table { width: 100%; border-collapse: collapse; font-size: ${dims.fs}; }
    .doc-totals table td { padding: 4px 8px; border-bottom: 1px solid #ddd; }
    .doc-totals table td.tv { text-align: right; font-weight: 600; }
    .doc-totals .grand td { font-size: ${size === 'a4' ? '14px' : '12px'}; font-weight: bold; border-top: 3px solid #f59e0b; border-bottom: none; color: #1e40af; background: #eff6ff; }

    /* Signature: line above name */
    .doc-sign { margin-top: 32px; display: flex; justify-content: space-between; gap: 16px; page-break-inside: avoid; break-inside: avoid; }
    .doc-sign-block { flex: 1; text-align: center; padding: 0 8px; }
    .doc-sign-line { border-top: 1px solid #333; margin-top: 36px; padding-top: 4px; }
    .doc-sign-role { font-size: ${dims.fs}; font-weight: bold; color: #0f766e; margin-top: 3px; }
    .doc-sign-name { font-size: ${dims.fs}; color: #334155; margin-top: 1px; }

    /* Footer pinned to bottom */
    .pf-wrap { position: absolute; bottom: ${size === 'a4' ? '6mm' : '4mm'}; left: ${size === 'a4' ? '14mm' : '10mm'}; right: ${size === 'a4' ? '14mm' : '10mm'}; }
    .pf-inner { border-top: 1px solid #0d9488; padding-top: 4px; }
    .pf-contact { text-align: center; font-size: 8px; color: #475569; margin-bottom: 3px; }
    .pf-meta { display: flex; justify-content: space-between; font-size: 7px; color: #999; }

    @media print { body { background: #fff; } .page { margin: 0; } }
  `;
}

function buildDocHeader(businessName: string, logoData: string | null | undefined, info: BusinessReceiptInfo, showLogo = true, receiptHeader?: string | null): string {
  const logo = (showLogo && logoData) ? `<img src="${logoData}" class="ph-logo" alt="logo" />` : '';
  const headerLine = receiptHeader ? `<p class="ph-line" style="font-weight:bold">${esc(receiptHeader)}</p>` : '';
  const lines: string[] = [];
  if (info.slogan) lines.push(`<p class="ph-slogan"><em>${esc(info.slogan)}</em></p>`);
  if (info.address) lines.push(`<p class="ph-line">${esc(info.address)}</p>`);
  const contact: string[] = [];
  if (info.phone) contact.push(`Tel: ${esc(info.phone)}`);
  if (info.email) contact.push(esc(info.email));
  if (info.website) contact.push(esc(info.website));
  if (contact.length) lines.push(`<p class="ph-line">${contact.join(' &nbsp;|&nbsp; ')}</p>`);
  const reg: string[] = [];
  if (info.tinNumber) reg.push(`TIN: ${esc(info.tinNumber)}`);
  if (info.rssbNumber) reg.push(`RSSB: ${esc(info.rssbNumber)}`);
  if (reg.length) lines.push(`<p class="ph-line">${reg.join(' &nbsp;|&nbsp; ')}</p>`);
  if (info.bankName || info.bankAccount) {
    const bankParts: string[] = [];
    if (info.bankName) bankParts.push(esc(info.bankName));
    if (info.bankAccount) bankParts.push(`Acct: ${esc(info.bankAccount)}`);
    lines.push(`<p class="ph-line">Bank: ${bankParts.join(' — ')}</p>`);
  }
  return `<div class="ph-wrap"><div class="ph-inner">
    ${logo}
    <div class="ph-biz">
      <h1 class="ph-name">${esc(businessName)}</h1>
      ${headerLine}${lines.join('')}
    </div>
  </div></div>`;
}

function buildDocTitleBlock(title: string, docNo: string): string {
  return `<div class="doc-title-block">
    <div class="doc-type">${esc(title)}</div>
    <div class="doc-no">${esc(docNo)}</div>
  </div>
  <hr class="doc-title-divider" />`;
}

function buildDocFooter(info: BusinessReceiptInfo): string {
  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const printTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const addrParts: string[] = [];
  if (info.address) addrParts.push(esc(info.address));
  if (info.phone) addrParts.push(`Tel: ${esc(info.phone)}`);
  if (info.email) addrParts.push(esc(info.email));
  return `<div class="pf-wrap"><div class="pf-inner">
    ${addrParts.length ? `<div class="pf-contact">${addrParts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
    <div class="pf-meta">
      <span>Confidential Business Document</span>
      <span>Printed: ${printDate} ${printTime}</span>
      <span>Page 1 of 1</span>
      <span>Powered by MUD Software Company</span>
    </div>
  </div></div>`;
}

// ──────────────────────────────────────────────
// A4/A5 Debt Receipt
// ──────────────────────────────────────────────
export function buildDebtReceiptA4Html(d: DebtReceiptData, size: 'a4' | 'a5' = 'a4', showWatermark = false): string {
  const itemsHtml = d.items
    .map((it, i) => `<tr>
      <td class="c" style="width:5%">${i + 1}</td>
      <td style="width:30%"><strong>${esc(it.product_name)}</strong></td>
      <td class="c" style="width:10%">${it.quantity}</td>
      <td class="r" style="width:27%">${formatCurrency(Number(it.unit_price))}</td>
      <td class="r" style="width:28%">${formatCurrency(Number(it.subtotal))}</td>
    </tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Debt Receipt ${esc(d.receiptNo)}</title>
  <style>${pageStyles(size)}</style></head><body>
  ${showWatermark ? `<div class="watermark">${esc(d.watermarkText || d.businessName)}</div>` : ''}
  <div class="page"><div class="content">
    ${buildDocHeader(d.businessName, d.logoData, d.businessInfo, d.receiptShowLogo ?? true, d.receiptHeader)}
    ${buildDocTitleBlock('Debt Receipt', d.receiptNo)}
    <div class="doc-meta">
      <table>
        <tr><td class="lbl">Customer:</td><td><strong>${esc(d.customerName)}</strong></td></tr>
        ${d.customerPhone ? `<tr><td class="lbl">Phone:</td><td>${esc(d.customerPhone)}</td></tr>` : ''}
        ${d.customerTin ? `<tr><td class="lbl">Customer TIN:</td><td>${esc(d.customerTin)}</td></tr>` : ''}
      </table>
      <table style="text-align:right">
        <tr><td class="lbl">Date:</td><td>${esc(formatDate(d.date))}</td></tr>
      </table>
    </div>
    <table class="doc-items">
      <thead><tr>
        <th style="width:5%">No</th><th class="l" style="width:30%">Item</th>
        <th style="width:10%">Qty</th><th class="r" style="width:27%">Unit Price</th>
        <th class="r" style="width:28%">Total</th>
      </tr></thead>
      <tbody>${itemsHtml || '<tr><td colspan="5" style="text-align:center;color:#999">No items</td></tr>'}</tbody>
    </table>
    <div class="doc-totals">
      <table>
        <tr><td>Total</td><td class="tv">${formatCurrency(d.total)}</td></tr>
        <tr><td>Paid</td><td class="tv">${formatCurrency(d.paid)}</td></tr>
        ${d.taxEnabled && d.taxRate ? `<tr><td>Tax (${d.taxRate}%)</td><td class="tv">${formatCurrency(d.total * d.taxRate / 100)}</td></tr>` : ''}
        <tr class="grand"><td>BALANCE DUE</td><td class="tv">${formatCurrency(d.remaining)}</td></tr>
      </table>
    </div>
    ${(d.receiptShowSignature === false) ? '' : `<div class="doc-sign">
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">Issued By</div>
        <div class="doc-sign-name">${esc(d.signatureName || d.issuedBy)}</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">Customer Signature</div>
        <div class="doc-sign-name">${esc(d.customerName)}</div>
      </div>
    </div>`}
  </div>
  ${buildDocFooter(d.businessInfo)}
  </div></body></html>`;
}

// ──────────────────────────────────────────────
// A4/A5 Payment Receipt
// ──────────────────────────────────────────────
export function buildPaymentReceiptA4Html(d: PaymentReceiptData, size: 'a4' | 'a5' = 'a4', showWatermark = false): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${esc(d.paymentReceiptNo)}</title>
  <style>${pageStyles(size)}</style></head><body>
  ${showWatermark ? `<div class="watermark">${esc(d.watermarkText || d.businessName)}</div>` : ''}
  <div class="page"><div class="content">
    ${buildDocHeader(d.businessName, d.logoData, d.businessInfo, d.receiptShowLogo ?? true, d.receiptHeader)}
    ${buildDocTitleBlock('Payment Receipt', d.paymentReceiptNo)}
    <div class="doc-meta">
      <table>
        <tr><td class="lbl">Customer:</td><td><strong>${esc(d.customerName)}</strong></td></tr>
        ${d.customerTin ? `<tr><td class="lbl">Customer TIN:</td><td>${esc(d.customerTin)}</td></tr>` : ''}
        <tr><td class="lbl">Debt No:</td><td>${esc(d.debtNo)}</td></tr>
        <tr><td class="lbl">Method:</td><td>${esc(d.method)}</td></tr>
      </table>
      <table style="text-align:right">
        <tr><td class="lbl">Date:</td><td>${esc(formatDate(d.date))}</td></tr>
      </table>
    </div>
    <div class="doc-totals">
      <table>
        <tr class="grand"><td>AMOUNT PAID</td><td class="tv">${formatCurrency(d.amountPaid)}</td></tr>
        <tr><td>Remaining Balance</td><td class="tv">${formatCurrency(d.remaining)}</td></tr>
      </table>
    </div>
    ${(d.receiptShowSignature === false) ? '' : `<div class="doc-sign">
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">Issued By</div>
        <div class="doc-sign-name">${esc(d.signatureName || d.receivedBy)}</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">Customer Signature</div>
        <div class="doc-sign-name">${esc(d.customerName)}</div>
      </div>
    </div>`}
  </div>
  ${buildDocFooter(d.businessInfo)}
  </div></body></html>`;
}

// ──────────────────────────────────────────────
// Delivery Note (A4 only)
// ──────────────────────────────────────────────
export function buildDeliveryNoteHtml(d: DebtReceiptData, showWatermark = false): string {
  const itemsHtml = d.items
    .map((it, i) => `<tr>
      <td class="c" style="width:5%">${i + 1}</td>
      <td style="width:28%"><strong>${esc(it.product_name)}</strong></td>
      <td style="width:22%">${esc(it.item_type === 'service' ? 'Service' : 'Product')}</td>
      <td class="c" style="width:10%">${it.quantity}</td>
      <td class="r" style="width:17%">${formatCurrency(Number(it.unit_price))}</td>
      <td class="r" style="width:18%">${formatCurrency(Number(it.subtotal))}</td>
    </tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Delivery Note ${esc(d.deliveryNoteNo)}</title>
  <style>${pageStyles('a4')}</style></head><body>
  ${showWatermark ? `<div class="watermark">${esc(d.watermarkText || d.businessName)}</div>` : ''}
  <div class="page"><div class="content">
    ${buildDocHeader(d.businessName, d.logoData, d.businessInfo, d.receiptShowLogo ?? true, d.receiptHeader)}
    ${buildDocTitleBlock('Delivery Note', d.deliveryNoteNo)}
    <div class="doc-meta">
      <table>
        <tr><td class="lbl">From:</td><td>${esc(d.businessName)}</td></tr>
        <tr><td class="lbl">Date:</td><td>${esc(formatDate(d.date))}</td></tr>
      </table>
      <table style="text-align:right">
        <tr><td class="lbl">To:</td><td><strong>${esc(d.customerName)}</strong></td></tr>
        ${d.customerPhone ? `<tr><td class="lbl">Phone:</td><td>${esc(d.customerPhone)}</td></tr>` : ''}
        ${d.customerAddress ? `<tr><td class="lbl">Address:</td><td>${esc(d.customerAddress)}</td></tr>` : ''}
      </table>
    </div>
    <table class="doc-items">
      <thead><tr>
        <th style="width:5%">No</th><th class="l" style="width:28%">Item</th>
        <th class="l" style="width:22%">Description</th><th style="width:10%">Qty</th>
        <th class="r" style="width:17%">Unit Price</th><th class="r" style="width:18%">Total</th>
      </tr></thead>
      <tbody>${itemsHtml || '<tr><td colspan="6" style="text-align:center;color:#999">No items</td></tr>'}</tbody>
    </table>
    <div class="doc-totals">
      <table>
        <tr class="grand"><td>GRAND TOTAL</td><td class="tv">${formatCurrency(d.total)}</td></tr>
      </table>
    </div>
    <div class="doc-sign">
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">Delivered By</div>
        <div class="doc-sign-name">${esc(d.signatureName || d.issuedBy)}</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">Received By</div>
        <div class="doc-sign-name">${esc(d.customerName)}</div>
      </div>
    </div>
  </div>
  ${buildDocFooter(d.businessInfo)}
  </div></body></html>`;
}

// ──────────────────────────────────────────────
// Print dispatchers
// ──────────────────────────────────────────────
export function printDebtReceipt(d: DebtReceiptData, format: PrintFormat = 'receipt', showWatermark = false): void {
  const html =
    format === 'receipt' ? buildDebtReceiptHtml(d, showWatermark) :
    format === 'a4' ? buildDebtReceiptA4Html(d, 'a4', showWatermark) :
    buildDebtReceiptA4Html(d, 'a5', showWatermark);
  printHtmlDocument(html);
}

export function printPaymentReceipt(d: PaymentReceiptData, format: PrintFormat = 'receipt', showWatermark = false): void {
  const html =
    format === 'receipt' ? buildPaymentReceiptHtml(d, showWatermark) :
    format === 'a4' ? buildPaymentReceiptA4Html(d, 'a4', showWatermark) :
    buildPaymentReceiptA4Html(d, 'a5', showWatermark);
  printHtmlDocument(html);
}

export function printDeliveryNote(d: DebtReceiptData, showWatermark = false): void {
  printHtmlDocument(buildDeliveryNoteHtml(d, showWatermark));
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

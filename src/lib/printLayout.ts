import type { BusinessInfo } from './exportReport';

export const BRAND_TEAL = '#0d9488';
export const BRAND_TEAL_DARK = '#0f766e';
export const BRAND_TEAL_LIGHT = '#f0fdfa';
export const BRAND_SLATE = '#475569';
export const BRAND_SLATE_LIGHT = '#94a3b8';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface PrintHeaderOptions {
  businessInfo: BusinessInfo;
  documentTitle: string;
  documentNo?: string;
  showLogo?: boolean;
}

export function buildPrintHeader(opts: PrintHeaderOptions): string {
  const { businessInfo: b, showLogo = true } = opts;
  const logo = showLogo
    ? `<img src="${b.logoData || '/icon.png'}" class="ph-logo" alt="Ikaze Ledger" />`
    : '';

  const bizLines: string[] = [];
  if (b.address) bizLines.push(`<p class="ph-line">${esc(b.address)}</p>`);
  const contactParts: string[] = [];
  if (b.phone) contactParts.push(`Tel: ${esc(b.phone)}`);
  if (b.email) contactParts.push(esc(b.email));
  if (contactParts.length) bizLines.push(`<p class="ph-line">${contactParts.join(' &nbsp;|&nbsp; ')}</p>`);
  const regParts: string[] = [];
  if (b.tinNumber) regParts.push(`TIN: ${esc(b.tinNumber)}`);
  if (b.rssbNumber) regParts.push(`RSSB: ${esc(b.rssbNumber)}`);
  if (regParts.length) bizLines.push(`<p class="ph-line">${regParts.join(' &nbsp;|&nbsp; ')}</p>`);

  return `<div class="ph-wrap">
    <div class="ph-inner">
      ${logo}
      <div class="ph-biz">
        <h1 class="ph-name">${esc(b.name)}</h1>
        ${b.slogan ? `<p class="ph-slogan">${esc(b.slogan)}</p>` : ''}
        ${bizLines.join('')}
      </div>
    </div>
  </div>`;
}

// Big, colored document title + number — placed between the header and the
// meta/items table (not inside the header box).
export function buildDocTitleBlock(title: string, docNo?: string): string {
  return `<div class="doc-title-block">
    <div class="doc-type">${esc(title)}</div>
    ${docNo ? `<div class="doc-no">${esc(docNo)}</div>` : ''}
  </div>
  <hr class="doc-title-divider" />`;
}

export interface PrintFooterOptions {
  businessInfo: BusinessInfo;
  confidentialLabel: string;
  pageLabel: string;
  poweredBy: string;
}

export function buildPrintFooter(opts: PrintFooterOptions): string {
  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const printTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const b = opts.businessInfo;

  const addrParts: string[] = [];
  if (b.address) addrParts.push(esc(b.address));
  if (b.phone) addrParts.push(`Tel: ${esc(b.phone)}`);
  if (b.email) addrParts.push(esc(b.email));

  return `<div class="pf-wrap">
    <div class="pf-inner">
      <div class="pf-contact">${addrParts.join(' &nbsp;|&nbsp; ')}</div>
      <div class="pf-meta">
        <span>${esc(opts.confidentialLabel)}</span>
        <span>${esc(printDate)} ${esc(printTime)}</span>
        ${opts.pageLabel ? `<span>${esc(opts.pageLabel)}</span>` : ''}
        <span>${esc(opts.poweredBy)}</span>
      </div>
    </div>
  </div>`;
}

export const PRINT_BASE_STYLES = `
  @page { margin: 12mm 14mm 20mm 14mm; size: A4 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #111; background: #fff; }
  .page { width: 100%; min-height: 265mm; position: relative; page-break-after: always; padding-bottom: 18mm; }
  .page:last-child { page-break-after: auto; }

  /* ── Professional Print Header ── */
  .ph-wrap { border: 2px solid ${BRAND_TEAL}; border-radius: 10px; overflow: hidden; margin-bottom: 5mm; }
  .ph-inner { display: flex; align-items: center; gap: 16px; padding: 14px 20px; background: ${BRAND_TEAL_LIGHT}; }
  .ph-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; flex-shrink: 0; border: 1px solid ${BRAND_TEAL}; }
  .ph-biz { flex: 1; text-align: center; }
  .ph-name { font-size: 20px; font-weight: bold; color: ${BRAND_TEAL_DARK}; letter-spacing: 0.3px; }
  .ph-slogan { font-size: 11px; font-style: italic; color: ${BRAND_SLATE}; margin: 2px 0 3px; }
  .ph-line { font-size: 11px; color: ${BRAND_SLATE}; margin: 1px 0; }
  .ph-doc { display: none; }
  .doc-title-block { text-align: center; margin: 10px 0 8px; }
  .doc-type { font-size: 18px; font-weight: bold; color: ${BRAND_TEAL_DARK}; letter-spacing: 2px; text-transform: uppercase; }
  .doc-no { font-size: 12px; font-weight: bold; color: ${BRAND_SLATE}; margin-top: 2px; letter-spacing: 1px; }
  .doc-title-divider { border: none; border-top: 1px solid ${BRAND_TEAL}; margin: 8px 0; }

  /* ── Report title: large, centered between header and table ── */
  .report-title { text-align: center; font-size: 22px; font-weight: bold; color: ${BRAND_TEAL_DARK}; margin: 4mm 0 2mm; }
  .report-subtitle { text-align: center; font-size: 12px; color: ${BRAND_SLATE}; margin-bottom: 3mm; }
  .report-meta { font-size: 10px; color: #999; margin-bottom: 4mm; }
  .report-meta .prepared { display: block; margin-bottom: 1px; }

  /* ── Professional Print Footer ── */
  .pf-wrap { position: fixed; bottom: 3mm; left: 14mm; right: 14mm; background: #fff; z-index: 999; page-break-inside: avoid; break-inside: avoid; }
  .pf-inner { border-top: 1px solid ${BRAND_TEAL}; padding-top: 4px; }
  .pf-contact { text-align: center; font-size: 8px; color: ${BRAND_SLATE}; margin-bottom: 3px; }
  .pf-meta { display: flex; justify-content: space-between; font-size: 7px; color: #999; }

  /* ── Shared table styles ── */
  .doc-table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .doc-table th { border: 1px solid ${BRAND_TEAL}; padding: 7px 6px; font-weight: bold; background: ${BRAND_TEAL_LIGHT}; color: ${BRAND_TEAL_DARK}; text-align: center; font-size: 10px; }
  .doc-table th.l { text-align: left; }
  .doc-table th.r { text-align: right; }
  .doc-table td { border: 1px solid #aaa; padding: 6px 5px; }
  .doc-table td.c { text-align: center; }
  .doc-table td.r { text-align: right; }
  .doc-table tr:nth-child(even) td { background: #f8fafc; }

  @media print { html, body { width: 100%; background: #fff; } .page { margin: 0; break-after: page; } .page:last-child { break-after: auto; } }
`;

/**
 * Downscales a base64 logo image to a small pixel size before it's embedded
 * in a jsPDF document. Logos are typically displayed at ~14-20mm on the
 * page, but if the source image is large (e.g. a phone photo, hundreds of
 * KB), jsPDF embeds the FULL original resolution regardless of the tiny
 * display size — this alone can make a PDF several times larger than
 * necessary. Re-encoding at a small, print-appropriate resolution keeps
 * every generated PDF small without any visible quality loss at that size.
 */
export async function resizeLogoForPdf(
  dataUrl: string,
  maxDim = 180,
): Promise<{ base64: string; format: 'PNG' | 'JPEG' }> {
  return new Promise((resolve) => {
    const fallback = () => resolve({
      base64: dataUrl.split(',')[1] || dataUrl,
      format: dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG',
    });
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return fallback();
          ctx.drawImage(img, 0, 0, w, h);
          // PNG keeps transparency (most logos have a transparent background);
          // quality/size tradeoff is still far smaller than an unscaled source.
          const resized = canvas.toDataURL('image/png');
          resolve({ base64: resized.split(',')[1], format: 'PNG' });
        } catch {
          fallback();
        }
      };
      img.onerror = fallback;
      img.src = dataUrl;
    } catch {
      fallback();
    }
  });
}

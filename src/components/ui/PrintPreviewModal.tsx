import { useCallback, useEffect, useState } from 'react';
import { Printer, FileDown, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { useLanguage } from '../../i18n';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  previewHtml: string;
  onPrint: () => void;
  onDownloadPdf?: () => Promise<void>;
  title?: string;
}

export function PrintPreviewModal({
  open,
  onClose,
  previewHtml,
  onPrint,
  onDownloadPdf,
  title,
}: PrintPreviewModalProps) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  // Modal mounts its children one render-cycle after `open` flips true (it
  // has its own internal enter/exit-animation state), so a plain useRef +
  // useEffect keyed on [open] can run BEFORE the iframe actually exists in
  // the DOM and silently do nothing. A callback ref fires exactly when the
  // node is attached, whenever that happens, so it's immune to that timing
  // gap — this is what actually makes the preview render reliably.
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const iframeCallbackRef = useCallback((node: HTMLIFrameElement | null) => {
    setIframeEl(node);
  }, []);

  useEffect(() => {
    if (!open || !iframeEl) return;
    const doc = iframeEl.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [open, previewHtml, iframeEl]);

  const handlePdf = async () => {
    if (!onDownloadPdf) return;
    setDownloading(true);
    try {
      await onDownloadPdf();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title ?? t.reports.printPreview} size="2xl">
      <div className="space-y-4">
        <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
          <iframe
            ref={iframeCallbackRef}
            title="Print Preview"
            className="h-[50vh] w-full rounded border-0 bg-white"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            <span className="flex items-center gap-1.5"><X className="h-4 w-4" /> {t.common.cancel}</span>
          </Button>
          {onDownloadPdf && (
            <Button variant="secondary" onClick={handlePdf} disabled={downloading}>
              <span className="flex items-center gap-1.5">
                {downloading ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
                {t.reports.exportPdf}
              </span>
            </Button>
          )}
          <Button onClick={onPrint}>
            <span className="flex items-center gap-1.5"><Printer className="h-4 w-4" /> {t.reports.print}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

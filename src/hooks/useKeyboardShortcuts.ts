import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onSearch?: () => void;
  onNewCustomer?: () => void;
  onNewProduct?: () => void;
  onNewDebt?: () => void;
  onRecordPayment?: () => void;
  onPrint?: () => void;
  onToggleTheme?: () => void;
}

/**
 * Global keyboard shortcut handler for desktop app.
 * - Ctrl+K / Cmd+K: Command Palette / search everywhere
 * - Ctrl+N: New (context-sensitive)
 * - Ctrl+P: Print
 * - Ctrl+Shift+T: Toggle theme
 * - F1: Help (future)
 * - Escape: Close overlays (handled by individual components)
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+K — Command Palette
    if (ctrl && e.key === 'k') {
      e.preventDefault();
      handlers.onSearch?.();
      return;
    }

    // Ctrl+P — Print
    if (ctrl && e.key === 'p' && !e.shiftKey) {
      e.preventDefault();
      handlers.onPrint?.();
      return;
    }

    // Ctrl+Shift+T — Toggle theme
    if (ctrl && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      handlers.onToggleTheme?.();
      return;
    }

    // Ctrl+N — New item (context sensitive, dispatched via custom event)
    if (ctrl && e.key === 'n' && !e.shiftKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('dms:new-item'));
      return;
    }

    // Ctrl+Shift+C — New customer
    if (ctrl && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      handlers.onNewCustomer?.();
      return;
    }

    // Ctrl+Shift+P — New product
    if (ctrl && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      handlers.onNewProduct?.();
      return;
    }

    // Ctrl+Shift+D — New debt
    if (ctrl && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      handlers.onNewDebt?.();
      return;
    }

    // Ctrl+Shift+R — Record payment
    if (ctrl && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      handlers.onRecordPayment?.();
      return;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}

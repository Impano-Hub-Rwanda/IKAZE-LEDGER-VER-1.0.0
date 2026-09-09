import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Users, Package, Warehouse,
  CreditCard, Banknote, FileText, Settings, Plus,
  CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useLanguage } from '../i18n';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: typeof Search;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNewCustomer?: () => void;
  onNewProduct?: () => void;
  onNewDebt?: () => void;
  onRecordPayment?: () => void;
}

export function CommandPalette({ open, onClose, onNewCustomer, onNewProduct, onNewDebt, onRecordPayment }: CommandPaletteProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'nav-dashboard', label: t.dashboard.title, category: t.nav.dashboard, icon: LayoutDashboard, action: () => navigate('/dashboard') },
      { id: 'nav-customers', label: t.customers.title, category: t.nav.customers, icon: Users, action: () => navigate('/customers') },
      { id: 'nav-products', label: t.products.title, category: t.nav.products, icon: Package, action: () => navigate('/products') },
      { id: 'nav-inventory', label: t.inventory.title, category: t.nav.inventory, icon: Warehouse, action: () => navigate('/inventory') },
      { id: 'nav-debts', label: t.debts.title, category: t.nav.debts, icon: CreditCard, action: () => navigate('/debts') },
      { id: 'nav-payments', label: t.payments.title, category: t.nav.payments, icon: Banknote, action: () => navigate('/payments') },
      { id: 'nav-reports', label: t.reports.title, category: t.nav.reports, icon: FileText, action: () => navigate('/reports') },
      { id: 'nav-settings', label: t.settings.title, category: t.nav.settings, icon: Settings, action: () => navigate('/settings') },
    ];

    const actions: CommandItem[] = [
      { id: 'act-new-customer', label: t.customers.add, category: t.nav.customers, icon: Plus, action: () => { navigate('/customers'); onNewCustomer?.(); } },
      { id: 'act-new-product', label: t.products.add, category: t.nav.products, icon: Plus, action: () => { navigate('/products'); onNewProduct?.(); } },
      { id: 'act-new-debt', label: t.debts.add, category: t.nav.debts, icon: Plus, action: () => { navigate('/debts'); onNewDebt?.(); } },
      { id: 'act-record-payment', label: t.payments.record, category: t.nav.payments, icon: Banknote, action: () => { navigate('/payments'); onRecordPayment?.(); } },
    ];

    return [...nav, ...actions];
  }, [t, navigate, onNewCustomer, onNewProduct, onNewDebt, onRecordPayment]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.keywords ?? '').toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-[20%] z-[61] w-full max-w-xl -translate-x-1/2 animate-modal-in px-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/5">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search everywhere..."
              className="flex-1 bg-transparent py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
            />
            <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-600 sm:block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No results for "{query}"
              </div>
            ) : (
              filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => { item.action(); onClose(); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      idx === selectedIndex
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-slate-400">{item.category}</span>
                    {idx === selectedIndex && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 dark:border-slate-700">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" />{t.ui.navigate}</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" />{t.ui.select}</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">{t.ui.poweredByMudShort}</span>
          </div>
        </div>
      </div>
    </>
  );
}

import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../i18n';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionIcon: LucideIcon;
  onAction: () => void;
}

export function PageHeader({ title, subtitle, actionLabel, actionIcon: Icon, onAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <Button onClick={onAction} size="lg" className="shrink-0">
        <span className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {actionLabel}
        </span>
      </Button>
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-11"
      />
    </div>
  );
}

interface EmptyStateProps {
  hasSearch: boolean;
  emptyTitle: string;
  emptyHint: string;
  noResults: string;
  addLabel: string;
  addIcon: LucideIcon;
  accentClass: string;
  onAdd: () => void;
}

export function EmptyState({
  hasSearch,
  emptyTitle,
  emptyHint,
  noResults,
  addLabel,
  addIcon: Icon,
  accentClass,
  onAdd,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-desk-sm dark:border-slate-600 dark:bg-slate-800">
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${accentClass}`}>
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-base font-semibold text-slate-800 dark:text-white">
        {hasSearch ? noResults : emptyTitle}
      </p>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        {hasSearch ? noResults : emptyHint}
      </p>
      {!hasSearch && (
        <Button onClick={onAdd} size="lg" className="mt-6">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {addLabel}
          </span>
        </Button>
      )}
    </div>
  );
}

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export function IconButton({ icon: Icon, label, onClick, danger = false }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

interface ConfirmDialogBodyProps {
  message: string;
  itemName: string;
  error: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialogBody({
  message,
  itemName,
  error,
  loading,
  onCancel,
  onConfirm,
}: ConfirmDialogBodyProps) {
  const { t } = useLanguage();
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
      </div>

      {itemName && (
        <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">{itemName}</p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading}>
          {t.common.cancel}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} fullWidth disabled={loading}>
          {t.common.delete}
        </Button>
      </div>
    </>
  );
}

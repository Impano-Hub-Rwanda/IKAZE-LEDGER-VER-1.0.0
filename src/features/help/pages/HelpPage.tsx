import { useState } from 'react';
import {
  LayoutDashboard, Users, Package, Warehouse, CreditCard, Banknote,
  FileText, FilePlus2, Settings, BookOpen, HelpCircle,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../../i18n';

interface HelpSection {
  id: string;
  icon: typeof BookOpen;
  titleKey: string;
  contentKey: string;
  steps?: { titleKey: string; bodyKey: string }[];
}

const SECTIONS: HelpSection[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    titleKey: 'dashboard',
    contentKey: 'help_dashboard',
    steps: [
      { titleKey: 'help_dashboard_overview_title', bodyKey: 'help_dashboard_overview_body' },
      { titleKey: 'help_dashboard_stats_title', bodyKey: 'help_dashboard_stats_body' },
      { titleKey: 'help_dashboard_charts_title', bodyKey: 'help_dashboard_charts_body' },
    ],
  },
  {
    id: 'customers',
    icon: Users,
    titleKey: 'customers',
    contentKey: 'help_customers',
    steps: [
      { titleKey: 'help_customers_add_title', bodyKey: 'help_customers_add_body' },
      { titleKey: 'help_customers_edit_title', bodyKey: 'help_customers_edit_body' },
      { titleKey: 'help_customers_tin_title', bodyKey: 'help_customers_tin_body' },
    ],
  },
  {
    id: 'products',
    icon: Package,
    titleKey: 'products',
    contentKey: 'help_products',
    steps: [
      { titleKey: 'help_products_add_title', bodyKey: 'help_products_add_body' },
      { titleKey: 'help_products_services_title', bodyKey: 'help_products_services_body' },
      { titleKey: 'help_products_pricing_title', bodyKey: 'help_products_pricing_body' },
    ],
  },
  {
    id: 'inventory',
    icon: Warehouse,
    titleKey: 'inventory',
    contentKey: 'help_inventory',
    steps: [
      { titleKey: 'help_inventory_stock_title', bodyKey: 'help_inventory_stock_body' },
      { titleKey: 'help_inventory_movements_title', bodyKey: 'help_inventory_movements_body' },
      { titleKey: 'help_inventory_auto_title', bodyKey: 'help_inventory_auto_body' },
    ],
  },
  {
    id: 'debts',
    icon: CreditCard,
    titleKey: 'debts',
    contentKey: 'help_debts',
    steps: [
      { titleKey: 'help_debts_create_title', bodyKey: 'help_debts_create_body' },
      { titleKey: 'help_debts_items_title', bodyKey: 'help_debts_items_body' },
      { titleKey: 'help_debts_receipt_title', bodyKey: 'help_debts_receipt_body' },
      { titleKey: 'help_debts_delivery_title', bodyKey: 'help_debts_delivery_body' },
    ],
  },
  {
    id: 'payments',
    icon: Banknote,
    titleKey: 'payments',
    contentKey: 'help_payments',
    steps: [
      { titleKey: 'help_payments_record_title', bodyKey: 'help_payments_record_body' },
      { titleKey: 'help_payments_partial_title', bodyKey: 'help_payments_partial_body' },
      { titleKey: 'help_payments_receipt_title', bodyKey: 'help_payments_receipt_body' },
    ],
  },
  {
    id: 'proforma',
    icon: FilePlus2,
    titleKey: 'proforma',
    contentKey: 'help_proforma',
    steps: [
      { titleKey: 'help_proforma_create_title', bodyKey: 'help_proforma_create_body' },
      { titleKey: 'help_proforma_items_title', bodyKey: 'help_proforma_items_body' },
      { titleKey: 'help_proforma_discount_title', bodyKey: 'help_proforma_discount_body' },
      { titleKey: 'help_proforma_pdf_title', bodyKey: 'help_proforma_pdf_body' },
    ],
  },
  {
    id: 'reports',
    icon: FileText,
    titleKey: 'reports',
    contentKey: 'help_reports',
    steps: [
      { titleKey: 'help_reports_types_title', bodyKey: 'help_reports_types_body' },
      { titleKey: 'help_reports_export_title', bodyKey: 'help_reports_export_body' },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    titleKey: 'settings',
    contentKey: 'help_settings',
    steps: [
      { titleKey: 'help_settings_business_title', bodyKey: 'help_settings_business_body' },
      { titleKey: 'help_settings_app_title', bodyKey: 'help_settings_app_body' },
      { titleKey: 'help_settings_receipt_title', bodyKey: 'help_settings_receipt_body' },
      { titleKey: 'help_settings_security_title', bodyKey: 'help_settings_security_body' },
      { titleKey: 'help_settings_backup_title', bodyKey: 'help_settings_backup_body' },
    ],
  },
  {
    id: 'demand-letter',
    icon: FileText,
    titleKey: 'demandLetter',
    contentKey: 'help_demand_letter',
    steps: [
      { titleKey: 'help_demand_letter_prepare_title', bodyKey: 'help_demand_letter_prepare_body' },
      { titleKey: 'help_demand_letter_customer_title', bodyKey: 'help_demand_letter_customer_body' },
      { titleKey: 'help_demand_letter_format_title', bodyKey: 'help_demand_letter_format_body' },
      { titleKey: 'help_demand_letter_pdf_title', bodyKey: 'help_demand_letter_pdf_body' },
    ],
  },
  {
    id: 'tips',
    icon: HelpCircle,
    titleKey: 'help_general_tips',
    contentKey: 'help_tips',
    steps: [
      { titleKey: 'help_tips_offline_title', bodyKey: 'help_tips_offline_body' },
      { titleKey: 'help_tips_backup_title', bodyKey: 'help_tips_backup_body' },
      { titleKey: 'help_tips_search_title', bodyKey: 'help_tips_search_body' },
    ],
  },
];

export function HelpPage() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>('dashboard');

  const ht = t.help;

  return (
    <div className="animate-page-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
          {ht.title}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {ht.subtitle}
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = expanded === section.id;
          return (
            <div
              key={section.id}
              className="card-base overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : section.id)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30">
                  <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {(t.nav as Record<string, string>)[section.titleKey] || ht[section.titleKey as keyof typeof ht] || section.titleKey}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {ht[section.contentKey as keyof typeof ht]}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                )}
              </button>

              {isOpen && section.steps && (
                <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-700">
                  {section.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {ht[step.titleKey as keyof typeof ht]}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {ht[step.bodyKey as keyof typeof ht]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Package, Wrench } from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { ProductsPage } from './ProductsPage';
import { ServicesPage } from './ServicesPage';

export function ProductsServicesPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'products' | 'services'>('products');

  return (
    <div className="animate-page-in space-y-6">
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-desk dark:border-slate-700 dark:bg-slate-800">
        <button
          onClick={() => setTab('products')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-desk ${
            tab === 'products'
              ? 'bg-teal-600 text-white shadow-desk-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>{t.productsServices.tabProducts}</span>
        </button>
        <button
          onClick={() => setTab('services')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-desk ${
            tab === 'services'
              ? 'bg-teal-600 text-white shadow-desk-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>{t.productsServices.tabServices}</span>
        </button>
      </div>

      {tab === 'products' ? <ProductsPage embedded /> : <ServicesPage embedded />}
    </div>
  );
}

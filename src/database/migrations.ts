import type { PGlite } from '@electric-sql/pglite';

/**
 * All CREATE TABLE statements for the full application.
 * Executed on first run. Safe to re-run (IF NOT EXISTS).
 *
 * IMPORTANT: PGlite does NOT support PL/pgSQL procedural blocks (DO $$ ... END $$).
 * Every statement must be plain SQL that PGlite can execute directly.
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS is supported as individual statements.
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','employee')),
    full_name     TEXT NOT NULL,
    phone         TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS security_questions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question   TEXT NOT NULL,
    answer_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS customers (
    id         SERIAL PRIMARY KEY,
    full_name  TEXT NOT NULL,
    phone      TEXT,
    address    TEXT,
    note       TEXT,
    tin_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS tin_number TEXT`,

  `CREATE TABLE IF NOT EXISTS products (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    model         TEXT,
    buying_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS debts (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    due_date    DATE,
    guarantor   TEXT,
    status      TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','partially_paid','paid','overdue')),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS debt_items (
    id            SERIAL PRIMARY KEY,
    debt_id       INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name  TEXT NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1,
    unit_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal      NUMERIC(14,2) NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
    id          SERIAL PRIMARY KEY,
    debt_id     INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    method      TEXT DEFAULT 'cash' CHECK (method IN ('cash','mobile_money','bank','other')),
    note        TEXT,
    paid_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS inventory_movements (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust')),
    quantity_change INTEGER NOT NULL,
    reason     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    id             SERIAL PRIMARY KEY,
    business_name  TEXT NOT NULL DEFAULT 'My Business',
    logo_url       TEXT,
    phone          TEXT,
    address        TEXT,
    currency       TEXT NOT NULL DEFAULT 'RWF',
    receipt_footer TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    entity     TEXT,
    entity_id  INTEGER,
    details    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Settings additions
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS owner_name TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS slogan TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'dark'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_width TEXT NOT NULL DEFAULT '80mm'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS report_paper_size TEXT NOT NULL DEFAULT 'a4'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_print_debt BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_print_payment BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_print_configured BOOLEAN NOT NULL DEFAULT FALSE`,
  // Existing installations used auto-print by default. Convert that legacy default
  // to opt-in exactly once, then mark the setting as configured.
  `UPDATE settings SET auto_print_debt=FALSE, auto_print_payment=FALSE WHERE auto_print_configured=FALSE`,
  `UPDATE settings SET auto_print_configured=TRUE WHERE auto_print_configured=FALSE`,

  // Expanded settings columns (v1.0 production)
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_data TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS signature_name TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS signature_image TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS watermark_text TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_header TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_show_logo BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_show_signature BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_show_watermark BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS report_logo TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS report_header TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS report_footer TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_report TEXT NOT NULL DEFAULT 'customers'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS startup_page TEXT NOT NULL DEFAULT 'dashboard'`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_save BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER NOT NULL DEFAULT 30`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS pin_hash TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS open_at_startup BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS minimize_to_tray BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS global_shortcut TEXT NOT NULL DEFAULT 'Ctrl+Shift+D'`,

  // Business info expansion
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS tin_number TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS rssb_number TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS website TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_name TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account TEXT`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_owner_on_reports BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_owner_on_receipts BOOLEAN NOT NULL DEFAULT TRUE`,

  // Products: unit, description, category, SKU
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT`,

  // Services table
  `CREATE TABLE IF NOT EXISTS services (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    default_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // debt_items: support both products and services
  `ALTER TABLE debt_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service'))`,
  `ALTER TABLE debt_items ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL`,

  `CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)`,
  `CREATE INDEX IF NOT EXISTS idx_debt_items_service_id ON debt_items(service_id)`,
  `CREATE INDEX IF NOT EXISTS idx_debt_items_item_type ON debt_items(item_type)`,
  `CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_debt_items_debt_id ON debt_items(debt_id)`,
  `CREATE INDEX IF NOT EXISTS idx_debt_items_product_id ON debt_items(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_debt_id ON payments(debt_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_debt_paid_at ON payments(debt_id, paid_at)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity)`,
  `CREATE INDEX IF NOT EXISTS idx_debts_created_at ON debts(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_debts_customer_created_at ON debts(customer_id, created_at)`,

  // ── Pro Forma Invoices ──
  `CREATE TABLE IF NOT EXISTS proforma_invoices (
    id            SERIAL PRIMARY KEY,
    invoice_no    TEXT NOT NULL,
    customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_tin  TEXT,
    customer_address TEXT,
    quotation_date DATE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed')),
    subtotal      NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'fixed',
    discount_value NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_rate      NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    tax_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    grand_total   NUMERIC(14,2) NOT NULL DEFAULT 0,
    terms         TEXT,
    notes         TEXT,
    show_watermark BOOLEAN NOT NULL DEFAULT FALSE,
    show_signature BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS proforma_items (
    id            SERIAL PRIMARY KEY,
    proforma_id   INTEGER NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name  TEXT NOT NULL,
    description   TEXT,
    unit          TEXT,
    quantity      NUMERIC(14,2) NOT NULL DEFAULT 1,
    unit_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
    total         NUMERIC(14,2) NOT NULL DEFAULT 0
  )`,

  // ── Pro Forma Items: support both products and services ──
  `ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service'))`,
  `ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL`,

  `CREATE INDEX IF NOT EXISTS idx_proforma_items_service_id ON proforma_items(service_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proforma_items_item_type ON proforma_items(item_type)`,

  `CREATE INDEX IF NOT EXISTS idx_proforma_created_at ON proforma_invoices(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_proforma_customer_id ON proforma_invoices(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proforma_status ON proforma_invoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id)`,
  `CREATE INDEX IF NOT EXISTS idx_proforma_items_product_id ON proforma_items(product_id)`,

  // ── Demand Letters ──
  `CREATE TABLE IF NOT EXISTS demand_letters (
    id              SERIAL PRIMARY KEY,
    reference       TEXT NOT NULL UNIQUE,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name   TEXT,
    letter_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline        DATE,
    subject         TEXT NOT NULL DEFAULT '',
    body_html       TEXT NOT NULL DEFAULT '',
    closing         TEXT NOT NULL DEFAULT '',
    show_debt_table BOOLEAN NOT NULL DEFAULT TRUE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demand_letters_customer_id ON demand_letters(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_demand_letters_user_id ON demand_letters(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_demand_letters_updated_at ON demand_letters(updated_at)`,
  `ALTER TABLE demand_letters ADD COLUMN IF NOT EXISTS admin_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE demand_letters ADD COLUMN IF NOT EXISTS recipient_label TEXT NOT NULL DEFAULT 'Bwana / Madamu muyobozi wa:'`,
];

const SCHEMA_VERSION = 6;

export async function runMigrations(db: PGlite): Promise<void> {
  // Avoid re-running the entire schema (dozens of CREATE/ALTER/INDEX queries)
  // on every application start. Migrations are still fully executed on a fresh
  // database or after a schema version change.
  await db.query(`CREATE TABLE IF NOT EXISTS ikaze_schema_meta (version INTEGER NOT NULL)`);
  const current = await db.query<{ version: number | string }>(
    `SELECT version FROM ikaze_schema_meta ORDER BY version DESC LIMIT 1`,
  );
  if (Number(current.rows[0]?.version) === SCHEMA_VERSION) return;

  for (const stmt of SCHEMA_STATEMENTS) {
    await db.query(stmt);
  }

  await db.query(`DELETE FROM ikaze_schema_meta`);
  await db.query(`INSERT INTO ikaze_schema_meta (version) VALUES ($1)`, [SCHEMA_VERSION]);
}
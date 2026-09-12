# IKAZE Ledger v1.0.12 — Stability & Compatibility Review

## Included fixes

- Legacy backup restore remains compatible with backups that predate newer columns.
- Restore is transactional and rolls back on failure.
- Restore validates restored row counts before commit.
- Restore accepts unioned row columns so fields present only on later legacy rows are not silently dropped.
- Debt totals are preserved from the backup; restore does not recompute historical totals from line items.
- Demand Letter recipient prefix is editable and is saved/restored with the letter.
- Customer reports show the customer name directly under the report title, omit customer phone, and show the report date with the customer identity block.
- Linux release workflow added for Debian and AppImage packages.
- Windows release workflow accepts the current UI version without changing signing-key material.
- Tauri WebAssembly CSP remains enabled for PGlite startup.
- The updater signing public-key field was preserved unchanged from the v1.0.11 package.

## Backup sample verification

The supplied backup was inspected before packaging. It contains 13 tables and the expected business records, including 27 customers, 13 products, 2 services, 21 debts, 25 debt items, 18 payments, 25 inventory movements, 1 proforma invoice, and 16 proforma items.

## Build verification note

The source package was statically reviewed and packaged. A full dependency-installed production build must be performed by GitHub Actions because this environment does not contain the project's installed npm dependencies.

# IKAZE Ledger v1.0.11 — Stability & Backup Compatibility Audit

- Supplied legacy backup format: v2; appVersion 1.0.0.
- Backup integrity SHA-256: PASS.
- Backup records: 27 customers, 13 products, 2 services, 21 debts, 25 debt items, 18 payments, 25 inventory movements, 1 proforma invoice, 16 proforma items, 0 audit logs.
- Foreign-key reference audit on the supplied backup: PASS.
- Backup columns are compatible with the current schema: PASS.
- Historical debt total/item-sum mismatches are preserved; restore never recalculates stored financial totals.
- Restore rejects duplicate tables and verifies restored row counts before COMMIT.
- Restore remains transactional and rolls back on failure.
- Legacy debt-item field variants are normalized without changing persisted debt totals.
- Schema version advanced to v5 so existing v4 installations execute the current idempotent schema pass.
- PGlite startup CSP retains `wasm-unsafe-eval`.
- Update check remains one-click check → download → install → relaunch.
- Existing updater endpoint/public key were preserved; no signing key material was changed.

A full production build was not executed in this isolated environment because project dependencies are not installed locally and package-registry access is unavailable. The authoritative Windows build is performed by the GitHub Actions workflow.

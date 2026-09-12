# IKAZE Ledger v22 verification

## Source/static verification
- Parsed all 87 `.ts`/`.tsx` files with TypeScript 5.8.3 parser: PASS (0 parse diagnostics).
- Verified unsafe debt restore total reconciliation was removed: PASS.
- Verified shared print footer is no longer absolutely positioned: PASS.
- Verified debt Edit item loading calls `setLines()` before the auxiliary stock query: PASS.
- Verified stock lookup failure is isolated and cannot erase loaded debt items: PASS.
- Verified edit loading has a loading state and stale async loads are guarded: PASS.

## Backup data verification
Backup: `dms-backup-2026-08-20-12-15-29.json`
- 21 debts: PASS
- 25 debt items: PASS
- 13 products / 2 services: PASS
- Missing product references from debt items: 0
- Stored-total/item-sum mismatches with existing items: debt IDs 2, 72, 73
- These mismatches are preserved intentionally. Restore must not silently rewrite financial totals from incomplete historical item rows.

## Build verification
A full `npm run build` could not be executed in this isolated environment because the project dependencies are not installed and the package registry is unreachable (`EAI_AGAIN` while fetching `@tauri-apps/plugin-notification`). This is an environment/network limitation, not a reported source-code build failure.

# IKAZE Ledger — Demand Letter v23 Test Report

## Changes verified
- Demand Letter number is rendered as `No: 001` (and subsequent number).
- Default body no longer contains the closing sentences.
- Legacy `Nyakubahwa` is migrated to `Bwana / Madamu` when opening saved letters.
- Legacy closing paragraphs are removed from the body when opening saved letters.
- Recipient header renders `Bwana / Madamu muyobozi wa: [Client Name]`.
- Date is aligned on the right side with the recipient/header block.
- A4 print margins are set to 20mm top, 25.4mm left/right, 30mm bottom.
- HTML print footer is fixed to the bottom and the bottom print margin reserves its space.
- Footer contains the default closing sentence and remains editable through the Footer field.
- PDF uses matching 25.4mm side margin and a 30mm footer reserve.
- PDF closing sentence is rendered in the fixed footer rather than in the body/signature area.
- Signature area keeps the administrator name without the closing sentence.

## Backup safety verification
The supplied backup contains 21 debts and 25 debt items. It contains stored total/item-sum mismatches for debt IDs 2, 72 and 73. Therefore this version does NOT automatically replace persisted `debts.total_amount` with the sum of `debt_items`; this avoids silently changing historical financial data during restore/edit.

## Static tests
- TypeScript/TSX parser check: PASS — 87 files, 0 parse errors.
- Demand Letter source assertions: PASS.
- Backup JSON load/structure check: PASS.
- ZIP integrity check: PASS.

## Full build
`npm run build` was attempted. It could not complete because this runtime has no installed `node_modules`, and `npm ci --offline` cannot retrieve the uncached package `@tauri-apps/plugin-notification`. A networked `npm ci` also timed out. The resulting `npm run build` errors are dependency-resolution errors (e.g. missing `react`, `vite`, Tauri plugins), not syntax errors in the modified Demand Letter file.

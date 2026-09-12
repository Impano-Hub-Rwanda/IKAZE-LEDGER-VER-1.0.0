# IKAZE Ledger v25 — Demand Letter Verification

## Changes verified
- `No:` reference is rendered on the LEFT, below the recipient/client block and above `Impamvu`.
- Visible vertical spacing separates `No:` from `Impamvu`.
- Client introduction remains constrained to the left 50% of the content width and wraps within that boundary.
- Date remains in the upper-right block aligned with the first client line.
- A4 page uses the existing requested margins: 20mm top, 25.4mm left/right, 30mm bottom.
- Preview footer is positioned relative to the full A4 page and moved close to the bottom.
- Print footer is fixed near the physical bottom of the A4 page and has increased readable font size.
- Footer no longer contains the conclusion sentence.
- Conclusion remains in the letter body as the default closing sentence.
- PDF header was updated to use the same LEFT-side `No:` placement as the HTML print/preview output.
- PDF footer was moved lower and enlarged slightly.

## Static integrity checks
- DemandLetterPage.tsx brace balance: PASS
- DemandLetterPage.tsx parenthesis balance: PASS
- DemandLetterPage.tsx bracket balance: PASS
- DemandLetterPage.tsx backtick balance: PASS
- Required HTML/PDF `No:` placements: PASS
- Footer screen/print positioning rules: PASS

## Full production build
`npm ci` could not complete in this execution environment because the npm registry request timed out. Offline installation is also blocked because the cached registry metadata for `@tauri-apps/plugin-notification` is missing. Therefore a full `tsc && vite build` is NOT claimed as passed.

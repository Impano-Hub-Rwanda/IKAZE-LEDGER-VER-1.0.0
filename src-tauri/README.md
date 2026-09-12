# DMS — Debt Management System

Professional offline-first business management desktop application.

## Developer
- **Developer:** Marcel UWIMANA
- **Contact:** 0780937633
- **Organization:** MUD

## Features
- Customer debt tracking
- Payment recording with receipts
- Product & inventory management
- Professional business reports (PDF, Excel, Print)
- Full offline operation with local database
- Auto-backup to user-selected folder
- System tray integration
- Auto-update support
- Multi-language (English & Kinyarwanda)

## Building

```bash
# Install dependencies
npm install

# Build the frontend
npm run build

# Build the desktop app (requires Rust + Tauri CLI)
npx tauri build
```

## First-time setup
1. Run `npx tauri icon public/icon.svg` to generate proper icons
2. Configure updater endpoint in `tauri.conf.json`
3. Build with `npx tauri build`

## Tech Stack
- Frontend: React, TypeScript, Tailwind CSS, Vite
- Backend: PGlite (PostgreSQL in browser)
- Desktop: Tauri v2 (Rust)

---
© 2026 MUD — Marcel UWIMANA. All rights reserved.
Powered by MUD

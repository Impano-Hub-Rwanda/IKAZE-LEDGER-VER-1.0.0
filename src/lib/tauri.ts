/**
 * Tauri API wrapper — centralised access to all desktop plugins.
 * Gracefully degrades to no-op/web fallbacks when running in browser (dev mode).
 */

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function safeImport<T>(importFn: () => Promise<T>): Promise<T | null> {
  if (!isTauri()) return null;
  try {
    return await importFn();
  } catch {
    return null;
  }
}

// ── Window controls ──────────────────────────────────────────
export async function minimizeWindow(): Promise<void> {
  const win = await safeImport(() => import('@tauri-apps/api/window'));
  await win?.getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  const win = await safeImport(() => import('@tauri-apps/api/window'));
  await win?.getCurrentWindow().toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  // Check minimizeToTray setting before closing
  try {
    const minimizeToTray = await getStore('ikaze-minimize-to-tray');
    if (minimizeToTray === true) {
      const win = await safeImport(() => import('@tauri-apps/api/window'));
      await win?.getCurrentWindow().hide();
      return;
    }
  } catch { /* if store read fails, proceed to exit */ }
  const proc = await safeImport(() => import('@tauri-apps/plugin-process'));
  if (proc) {
    await proc.exit(0);
    return;
  }
  const win = await safeImport(() => import('@tauri-apps/api/window'));
  await win?.getCurrentWindow().hide();
}

export async function startDragging(): Promise<void> {
  const win = await safeImport(() => import('@tauri-apps/api/window'));
  await win?.getCurrentWindow().startDragging();
}

// ── Dialog ───────────────────────────────────────────────────
export async function openFolderPicker(): Promise<string | null> {
  const dialog = await safeImport(() => import('@tauri-apps/plugin-dialog'));
  if (!dialog) return null;
  return dialog.open({ directory: true, multiple: false });
}

export async function openFilePicker(filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  const dialog = await safeImport(() => import('@tauri-apps/plugin-dialog'));
  if (!dialog) return null;
  return dialog.open({ filters, multiple: false });
}

export async function saveFileDialog(defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  const dialog = await safeImport(() => import('@tauri-apps/plugin-dialog'));
  if (!dialog) return null;
  return dialog.save({ defaultPath: defaultName, filters });
}

export async function showMessageBox(title: string, message: string, kind: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
  const dialog = await safeImport(() => import('@tauri-apps/plugin-dialog'));
  if (!dialog) {
    alert(message);
    return;
  }
  await dialog.message(message, { title, kind });
}

export async function confirmDialog(title: string, message: string, kind: 'info' | 'warning' | 'error' = 'warning'): Promise<boolean> {
  const dialog = await safeImport(() => import('@tauri-apps/plugin-dialog'));
  if (!dialog) return window.confirm(message);
  return dialog.confirm(message, { title, kind });
}

// ── File System ──────────────────────────────────────────────
export async function writeFile(path: string, data: string | Uint8Array): Promise<void> {
  const fs = await safeImport(() => import('@tauri-apps/plugin-fs'));
  if (!fs) throw new Error('File system not available in browser mode');
  if (typeof data === 'string') {
    await fs.writeTextFile(path, data);
  } else {
    await fs.writeFile(path, data);
  }
}

export async function readBinaryFile(path: string): Promise<Uint8Array> {
  const fs = await safeImport(() => import('@tauri-apps/plugin-fs'));
  if (!fs) throw new Error('File system not available in browser mode');
  return fs.readFile(path);
}

export async function readFile(path: string): Promise<string> {
  const fs = await safeImport(() => import('@tauri-apps/plugin-fs'));
  if (!fs) throw new Error('File system not available in browser mode');
  return fs.readTextFile(path);
}

export async function renameFile(from: string, to: string): Promise<void> {
  const fs = await safeImport(() => import('@tauri-apps/plugin-fs'));
  if (!fs) throw new Error('File system not available in browser mode');
  await fs.rename(from, to);
}

export async function fileExists(path: string): Promise<boolean> {
  const fs = await safeImport(() => import('@tauri-apps/plugin-fs'));
  if (!fs) return false;
  return fs.exists(path);
}

export async function createDir(path: string): Promise<void> {
  const fs = await safeImport(() => import('@tauri-apps/plugin-fs'));
  if (!fs) return;
  await fs.mkdir(path, { recursive: true });
}

// ── Store (persistent key-value) ─────────────────────────────
export async function getStore(key: string): Promise<unknown> {
  const storeMod = await safeImport(() => import('@tauri-apps/plugin-store'));
  if (!storeMod) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }
  const store = await storeMod.load('settings.json');
  return store.get(key);
}

export async function setStore(key: string, value: unknown): Promise<void> {
  const storeMod = await safeImport(() => import('@tauri-apps/plugin-store'));
  if (!storeMod) {
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  const store = await storeMod.load('settings.json');
  await store.set(key, value);
  await store.save();
}

// ── Notifications ────────────────────────────────────────────
export async function sendNotification(title: string, body: string): Promise<void> {
  const notif = await safeImport(() => import('@tauri-apps/plugin-notification'));
  if (!notif) return;
  const perm = await notif.requestPermission();
  if (perm === 'granted') {
    await notif.sendNotification({ title, body });
  }
}

// ── Clipboard ────────────────────────────────────────────────
export async function writeClipboard(text: string): Promise<void> {
  const clip = await safeImport(() => import('@tauri-apps/plugin-clipboard-manager'));
  if (!clip) {
    navigator.clipboard?.writeText(text);
    return;
  }
  await clip.writeText(text);
}

// ── OS info ──────────────────────────────────────────────────
export async function getOsInfo(): Promise<{ platform: string; arch: string; version: string; hostname: string } | null> {
  const os = await safeImport(() => import('@tauri-apps/plugin-os'));
  if (!os) return null;
  const hostname = await os.hostname();
  return {
    platform: os.platform(),
    arch: os.arch(),
    version: os.version(),
    hostname: hostname ?? 'unknown',
  };
}

// ── Process ──────────────────────────────────────────────────
export async function exitApp(code = 0): Promise<void> {
  const proc = await safeImport(() => import('@tauri-apps/plugin-process'));
  if (!proc) {
    window.close();
    return;
  }
  await proc.exit(code);
}

export async function restartApp(): Promise<void> {
  const proc = await safeImport(() => import('@tauri-apps/plugin-process'));
  if (!proc) return;
  await proc.relaunch();
}

// ── Updater ──────────────────────────────────────────────────
export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  body?: string;
  installed?: boolean;
  error?: string;
}

/**
 * Checks for a signed update. When one exists, it is downloaded and
 * installed immediately so the Settings button is a single-step action.
 * The updater itself verifies the signed artifact before installation.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult | null> {
  const updater = await safeImport(() => import('@tauri-apps/plugin-updater'));
  if (!updater) return null;

  try {
    const update = await updater.check();
    if (!update) return { available: false };

    const result: UpdateCheckResult = {
      available: true,
      version: update.version,
      body: update.body,
      installed: false,
    };

    // One click = check + download + install.
    // Tauri's updater verifies the configured public key before install.
    await update.downloadAndInstall();
    result.installed = true;

    // Windows exits as part of the updater installer flow. On Linux/macOS
    // the newly installed bundle must be relaunched explicitly.
    const proc = await safeImport(() => import('@tauri-apps/plugin-process'));
    await proc?.relaunch();

    return result;
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Backward-compatible explicit installer entry point. */
export async function downloadAndInstallUpdate(): Promise<void> {
  const updater = await safeImport(() => import('@tauri-apps/plugin-updater'));
  if (!updater) return;

  const update = await updater.check();
  if (!update) return;

  await update.downloadAndInstall();
  const proc = await safeImport(() => import('@tauri-apps/plugin-process'));
  await proc?.relaunch();
}

// ── Shell ────────────────────────────────────────────────────
export async function openExternal(url: string): Promise<void> {
  const shell = await safeImport(() => import('@tauri-apps/plugin-shell'));
  if (!shell) {
    window.open(url, '_blank');
    return;
  }
  await shell.open(url);
}

// ── Print HTML in the current Tauri webview ─────────────────
// Tauri/WebView can fail to print iframe.contentWindow (upstream issue),
// so printing is performed from the main window with the application UI
// temporarily hidden in print media.
let isPrintingHtml = false;

export function printHtmlDocument(html: string): void {
  if (isPrintingHtml) return;

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const thermalMatch = (parsed.head?.textContent || '').match(/@page\s*\{[^}]*size:\s*(58mm|80mm)/i);
  const thermalWidth = thermalMatch?.[1] || null;
  const printRoot = document.createElement('div');
  printRoot.id = '__ikaze_print_root__';
  printRoot.setAttribute('aria-hidden', 'true');
  printRoot.innerHTML = parsed.body?.innerHTML || html;

  const printStyles = document.createElement('style');
  printStyles.id = '__ikaze_print_styles__';
  printStyles.textContent = `
    /* Keep the application's theme completely outside the print document. */
    #__ikaze_print_root__,
    #__ikaze_print_root__ * {
      color-scheme: light !important;
    }

    #__ikaze_print_root__ {
      display: block !important;
      background: #fff !important;
      color: #000 !important;
      box-sizing: border-box !important;
    }

    @media screen {
      #__ikaze_print_root__ {
        display: none !important;
      }
    }

    @media print {
      html,
      body {
        background: #fff !important;
        color: #000 !important;
        color-scheme: light !important;
      }

      body > *:not(#__ikaze_print_root__) {
        display: none !important;
      }

      body > #__ikaze_print_root__ {
        display: block !important;
        width: ${thermalWidth ? thermalWidth : 'auto'} !important;
        min-width: 0 !important;
        max-width: none !important;
        background: #fff !important;
        color: #000 !important;
        box-sizing: border-box !important;
      }

      #__ikaze_print_root__,
      #__ikaze_print_root__ * {
        color-scheme: light !important;
      }
    }
  `;

  // Copy the generated document's <style> elements into the real document
  // so @page rules and the document's own print layout CSS are honored.
  const generatedStyles = Array.from(parsed.head?.querySelectorAll('style') || []);
  const clonedStyles = generatedStyles.map((style) => {
    const clone = document.createElement('style');
    // The generated HTML normally styles `body`. Because the print payload is
    // mounted inside the application's body, scope those body selectors to
    // the isolated print root so receipt/A4/A5 dimensions remain identical
    // to the standalone HTML document. @page rules are intentionally kept.
    const css = style.textContent || '';
    clone.textContent = css.replace(/\bbody\b/g, '#__ikaze_print_root__');
    clone.setAttribute('data-ikaze-print-style', 'true');
    return clone;
  });

  const originalTitle = document.title;
  const previousPrintStyles = document.getElementById('__ikaze_print_styles__');
  const previousPrintRoot = document.getElementById('__ikaze_print_root__');

  // The application uses Tailwind's `.dark` selectors. Those selectors have
  // enough specificity to affect a print root inserted into the main DOM.
  // Temporarily remove only the theme marker while printing. This keeps the
  // actual printed document independent of Light/Dark Mode, including in the
  // Tauri desktop WebView. The original state is restored after printing.
  const themeNodes = [document.documentElement, document.body];
  const darkClassState = themeNodes.map((node) => ({
    node,
    hadDark: node.classList.contains('dark'),
  }));
  const previousColorScheme = document.documentElement.style.colorScheme;
  const previousBodyColorScheme = document.body.style.colorScheme;

  isPrintingHtml = true;
  document.title = parsed.title || originalTitle;

  themeNodes.forEach((node) => node.classList.remove('dark'));
  document.documentElement.style.colorScheme = 'light';
  document.body.style.colorScheme = 'light';

  document.body.appendChild(printRoot);
  document.head.appendChild(printStyles);
  clonedStyles.forEach((style) => document.head.appendChild(style));

  let cleaned = false;
  let fallbackTimer: number | undefined;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    window.removeEventListener('afterprint', cleanup);
    if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);

    printRoot.remove();
    printStyles.remove();
    clonedStyles.forEach((style) => style.remove());

    previousPrintStyles?.remove();
    previousPrintRoot?.remove();

    darkClassState.forEach(({ node, hadDark }) => {
      node.classList.toggle('dark', hadDark);
    });

    document.documentElement.style.colorScheme = previousColorScheme;
    document.body.style.colorScheme = previousBodyColorScheme;
    document.title = originalTitle;
    isPrintingHtml = false;
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  // Wait for data-URL images, fonts and two layout frames before opening the
  // native printer. This is important for the Tauri desktop WebView.
  const waitForAssets = async () => {
    const images = Array.from(printRoot.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }));

    if ('fonts' in document && document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    window.focus();
    window.print();

    // Some WebViews do not emit afterprint consistently. Keep a fallback so
    // the application always returns to its original theme/state.
    fallbackTimer = window.setTimeout(cleanup, 60000);
  };

  void waitForAssets();
}

export { isTauri };

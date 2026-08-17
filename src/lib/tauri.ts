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
export async function checkForUpdates(): Promise<{ available: boolean; version?: string; body?: string } | null> {
  const updater = await safeImport(() => import('@tauri-apps/plugin-updater'));
  if (!updater) return null;
  try {
    const update = await updater.check();
    if (update) {
      return { available: true, version: update.version, body: update.body };
    }
    return { available: false };
  } catch {
    return null;
  }
}

export async function downloadAndInstallUpdate(): Promise<void> {
  const updater = await safeImport(() => import('@tauri-apps/plugin-updater'));
  if (!updater) return;
  const update = await updater.check();
  if (update) {
    await update.downloadAndInstall();
    const proc = await import('@tauri-apps/plugin-process');
    await proc.relaunch();
  }
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

// ── Print via hidden iframe (works in Tauri webview) ───────
export function printHtmlDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) { cleanup(); return; }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      cleanup();
    }
  };
}

export { isTauri };

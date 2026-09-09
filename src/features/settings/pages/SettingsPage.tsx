import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, SlidersHorizontal, Receipt, FileText, Shield,
  Database as DbIcon, HardDrive, Info, Save, Upload, Download,
  RotateCcw, RefreshCw, AlertCircle, LogOut, FolderOpen,
  CheckCircle2, XCircle, Phone, User, Trash2,
  Power, Keyboard,
} from 'lucide-react';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme, type Accent } from '../../../contexts/ThemeContext';
import { getDb } from '../../../lib/database';
import { getBusinessInfo, getAppSettings, invalidateSettingsCache, type BusinessInfo, type AppSettings } from '../../../lib/exportReport';
import { verifyPassword, hashPassword } from '../../../utils/crypto';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import {
  backupToFolder, restoreFromFile, resetDatabase,
  getBackupMetadata, checkDatabaseHealth,
} from '../../../lib/backupManager';
import {
  getAutoBackupConfig, saveAutoBackupConfig,
  type AutoBackupConfig,
} from '../../../lib/autoBackup';
import {
  openFolderPicker, isTauri, checkForUpdates, downloadAndInstallUpdate,
  sendNotification, setStore,
} from '../../../lib/tauri';
import { startAutoBackupService, stopAutoBackupService } from '../../../lib/autoBackup';

type Tab = 'business' | 'application' | 'receipt' | 'reports' | 'security' | 'database' | 'backup' | 'about';

interface DbInfo {
  size: string;
  totalRecords: number;
  tables: { name: string; count: number }[];
}

interface HealthCheck {
  status: 'healthy' | 'warning' | 'error';
  checks: { name: string; passed: boolean; detail: string }[];
}

type FlashType = 'success' | 'error' | 'info';

const APP_VERSION = '1.0.8';
const DEVELOPER = 'Marcel UWIMANA';
const DEVELOPER_PHONE = '0780937633';

export function SettingsPage() {
  const { t, setLanguage } = useLanguage();
  const { setTheme, accent, setAccent } = useTheme();
  const { user, logout } = useAuth();

  const [tab, setTab] = useState<Tab>('business');
  const [biz, setBiz] = useState<BusinessInfo | null>(null);
  const [app, setApp] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: FlashType; text: string } | null>(null);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pin, setPin] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState(30);

  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const [autoBackup, setAutoBackup] = useState<AutoBackupConfig | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; version?: string; body?: string } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [desktop, setDesktop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, ab] = await Promise.all([
        getBusinessInfo(), getAppSettings(), getAutoBackupConfig(),
      ]);
      setBiz(b);
      setApp(a);
      setAutoBackup(ab);
      setSessionTimeout(a.sessionTimeoutMinutes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    setDesktop(isTauri());
  }, [load]);

  const flash = (type: FlashType, text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  // ── Logo upload (works on ALL platforms — web and desktop) ──
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      flash('error', 'Logo must be under 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setBiz((prev) => prev ? { ...prev, logoData: base64 } : prev);
    };
    reader.readAsDataURL(file);
  }, []);

  const saveBusiness = useCallback(async () => {
    if (!biz) return;
    setSaving(true);
    try {
      const db = getDb();
      await db.query(
        `UPDATE settings SET business_name=$1, owner_name=$2, phone=$3, email=$4,
         address=$5, slogan=$6, logo_data=$7,
         tin_number=$8, rssb_number=$9, website=$10,
         bank_name=$11, bank_account=$12,
         show_owner_on_reports=$13, show_owner_on_receipts=$14
         WHERE id=1`,
        [biz.name, biz.ownerName, biz.phone, biz.email, biz.address, biz.slogan, biz.logoData,
         biz.tinNumber, biz.rssbNumber, biz.website,
         biz.bankName, biz.bankAccount,
         biz.showOwnerOnReports, biz.showOwnerOnReceipts],
      );
      invalidateSettingsCache();
      flash('success', t.settings.savedBusiness);
    } catch {
      flash('error', t.settings.errorSaving);
    } finally {
      setSaving(false);
    }
  }, [biz, t.settings]);

  const saveApp = useCallback(async () => {
    if (!app) return;
    setSaving(true);
    try {
      const db = getDb();
      await db.query(
        `UPDATE settings SET language=$1, theme=$2, date_format=$3, receipt_width=$4,
         report_paper_size=$5, auto_print_debt=$6, auto_print_payment=$7, auto_print_configured=TRUE,
         startup_page=$8, auto_save=$9, session_timeout_minutes=$10,
         minimize_to_tray=$11 WHERE id=1`,
        [app.language, app.theme, app.dateFormat, app.receiptWidth,
         app.reportPaperSize, app.autoPrintDebt, app.autoPrintPayment,
         app.startupPage, app.autoSave, sessionTimeout,
         app.minimizeToTray],
      );
      // Persist minimizeToTray to store so closeWindow can read it immediately
      await setStore('ikaze-minimize-to-tray', app.minimizeToTray);
      setLanguage(app.language as 'en' | 'rw');
      setTheme(app.theme as 'light' | 'dark');
      invalidateSettingsCache();
      flash('success', t.settings.savedApp);
    } catch {
      flash('error', t.settings.errorSaving);
    } finally {
      setSaving(false);
    }
  }, [app, sessionTimeout, t.settings, setLanguage, setTheme]);

  const saveReceiptSettings = useCallback(async () => {
    if (!app) return;
    setSaving(true);
    try {
      const db = getDb();
      await db.query(
        `UPDATE settings SET receipt_header=$1, receipt_show_logo=$2,
         receipt_show_signature=$3, receipt_show_watermark=$4,
         tax_enabled=$5, tax_rate=$6, signature_name=$7,
         watermark_text=$8 WHERE id=1`,
        [app.receiptHeader, app.receiptShowLogo, app.receiptShowSignature,
         app.receiptShowWatermark, app.taxEnabled, app.taxRate,
         app.signatureName, app.watermarkText],
      );
      invalidateSettingsCache();
      flash('success', 'Receipt settings saved');
    } catch {
      flash('error', t.settings.errorSaving);
    } finally {
      setSaving(false);
    }
  }, [app]);

  const saveReportSettings = useCallback(async () => {
    if (!app) return;
    setSaving(true);
    try {
      const db = getDb();
      await db.query(
        `UPDATE settings SET report_header=$1, report_footer=$2,
         default_report=$3 WHERE id=1`,
        [app.reportHeader, app.reportFooter, app.defaultReport],
      );
      invalidateSettingsCache();
      flash('success', 'Report settings saved');
    } catch {
      flash('error', t.settings.errorSaving);
    } finally {
      setSaving(false);
    }
  }, [app]);

  const saveSecuritySettings = useCallback(async () => {
    if (!app) return;
    setSaving(true);
    try {
      const db = getDb();
      let pinHash = app.pinHash;
      if (pin) {
        pinHash = await hashPassword(pin);
      }
      await db.query(
        `UPDATE settings SET session_timeout_minutes=$1, pin_hash=$2 WHERE id=1`,
        [sessionTimeout, pinHash],
      );
      invalidateSettingsCache();
      setPin('');
      flash('success', 'Security settings saved');
    } catch {
      flash('error', t.settings.errorSaving);
    } finally {
      setSaving(false);
    }
  }, [app, pin, sessionTimeout]);

  const changePassword = useCallback(async () => {
    if (!user || !newPwd || newPwd !== confirmPwd) {
      flash('error', t.settings.pwdNoMatch);
      return;
    }
    try {
      const db = getDb();
      const res = await db.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id=$1', [user.id],
      );
      const row = (res.rows as { password_hash: string }[])[0];
      if (!row || !(await verifyPassword(curPwd, row.password_hash))) {
        flash('error', t.settings.pwdWrongCurrent);
        return;
      }
      const newHash = await hashPassword(newPwd);
      await db.query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [newHash, user.id]);
      setCurPwd(''); setNewPwd(''); setConfirmPwd('');
      flash('success', t.settings.pwdChanged);
    } catch {
      flash('error', t.settings.errorSaving);
    }
  }, [user, curPwd, newPwd, confirmPwd, t.settings]);

  // ── Database operations ──
  const loadDbInfo = useCallback(async () => {
    setDbLoading(true);
    try {
      const meta = await getBackupMetadata();
      const db = getDb();
      let size = '—';
      try {
        const sizeRes = await db.query<{ pg_size: string }>(
          `SELECT pg_size_pretty(pg_database_size(current_database())) AS pg_size`,
        );
        size = (sizeRes.rows as { pg_size: string }[])[0]?.pg_size ?? '—';
      } catch { /* PGlite might not support this */ }
      setDbInfo({
        size,
        totalRecords: meta.totalRows,
        tables: meta.tableSummaries.map((s) => ({ name: s.table, count: s.rows })),
      });
    } finally {
      setDbLoading(false);
    }
  }, []);

  const runHealthCheck = useCallback(async () => {
    setDbLoading(true);
    try {
      const result = await checkDatabaseHealth();
      setHealth(result);
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'database') void loadDbInfo();
    if (tab === 'database' && !health) void runHealthCheck();
  }, [tab, loadDbInfo, health, runHealthCheck]);

  const handleBackup = useCallback(async () => {
    const result = await backupToFolder();
    if (result.success) {
      flash('success', `Backup saved${result.path ? ` to ${result.path}` : ''}`);
      if (desktop) void sendNotification('Ikaze Ledger Backup', 'Database backup completed successfully');
    } else if (result.error !== 'Cancelled') {
      flash('error', result.error || 'Backup failed');
    }
  }, [desktop]);

  const handleRestore = useCallback(async () => {
    const result = await restoreFromFile();
    if (result.success) {
      flash('success', 'Database restored. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } else if (result.error !== 'Cancelled') {
      flash('error', result.error || 'Restore failed');
    }
  }, []);

  const handleReset = useCallback(async () => {
    setResetOpen(false);
    const result = await resetDatabase();
    if (result.success) {
      flash('success', 'Database reset. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } else if (result.error !== 'Cancelled') {
      flash('error', result.error || 'Reset failed');
    }
  }, []);

  // ── Auto-backup folder selection ──
  const selectBackupFolder = useCallback(async () => {
    const folder = await openFolderPicker();
    if (folder && autoBackup) {
      setAutoBackup({ ...autoBackup, folderPath: folder as string });
      await saveAutoBackupConfig({ folderPath: folder as string });
      flash('success', `Backup folder set: ${folder}`);
    }
  }, [autoBackup]);

  const saveAutoBackup = useCallback(async () => {
    if (!autoBackup) return;
    await saveAutoBackupConfig(autoBackup);
    // Persist minimizeToTray to Tauri store so closeWindow can read it
    await setStore('ikaze-minimize-to-tray', app?.minimizeToTray ?? true);
    // Restart the auto-backup service to pick up new interval/enabled state
    stopAutoBackupService();
    startAutoBackupService();
    flash('success', 'Auto-backup settings saved');
  }, [autoBackup, app]);

  // ── Update check ──
  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      if (info?.error) {
        flash('error', `Update failed: ${info.error}`);
      } else if (info?.installed) {
        flash('success', `Update ${info.version ?? ''} installed. Restarting…`);
      } else if (info?.available) {
        flash('success', `Update ${info.version ?? ''} is being installed…`);
      } else if (info && !info.available) {
        flash('success', 'You are running the latest version');
      } else {
        flash('info', 'Update check not available in web mode');
      }
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    await downloadAndInstallUpdate();
  }, []);

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'business', label: 'Business', icon: Building2 },
    { key: 'application', label: 'Application', icon: SlidersHorizontal },
    { key: 'receipt', label: 'Receipt', icon: Receipt },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'database', label: 'Database', icon: DbIcon },
    { key: 'backup', label: 'Backup', icon: HardDrive },
    { key: 'about', label: 'About', icon: Info },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-page-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">{t.settings.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t.ui.administrationCenter}</p>
      </div>

      {msg && <Alert variant={msg.type === 'info' ? 'info' : msg.type}>{msg.text}</Alert>}

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-desk dark:border-slate-700 dark:bg-slate-800">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 ease-desk ${
              tab === tb.key
                ? 'bg-teal-600 text-white shadow-desk-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <tb.icon className="h-4 w-4" />
            <span className="hidden md:inline">{tb.label}</span>
          </button>
        ))}
      </div>

      {/* ── Business tab ── */}
      {tab === "business" && biz && (
        <div className="space-y-5">
          <div className="card-base space-y-5 p-6">
            <SectionHeader icon={Building2} title={t.settings.businessInfo} />

            {/* Company Section */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.sectionCompany}</p>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.logo}</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                    {biz.logoData ? <img src={biz.logoData} alt="Logo" className="h-full w-full object-contain" /> : <img src="/icon.png" alt="Ikaze Ledger" className="h-10 w-10 object-contain" loading="eager" decoding="async" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> {t.settings.uploadLogo}</span>
                    </Button>
                    {biz.logoData && (
                      <Button variant="ghost" size="sm" onClick={() => setBiz({ ...biz, logoData: null })}>
                        <span className="flex items-center gap-1.5"><Trash2 className="h-4 w-4" /> Remove</span>
                      </Button>
                    )}
                    <p className="text-xs text-slate-400">{t.ui.logoFileHint}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label={t.settings.businessName} required name="name" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
                <Input label={t.settings.ownerName} name="owner" value={biz.ownerName ?? ""} onChange={(e) => setBiz({ ...biz, ownerName: e.target.value })} />
                <Input label={t.settings.slogan} name="slogan" value={biz.slogan ?? ""} onChange={(e) => setBiz({ ...biz, slogan: e.target.value })} />
              </div>
            </div>

            {/* Registration Section */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.sectionRegistration}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label={t.settings.tinNumber} name="tin" value={biz.tinNumber ?? ""} onChange={(e) => setBiz({ ...biz, tinNumber: e.target.value })} />
                <Input label={t.settings.rssbNumber} name="rssb" value={biz.rssbNumber ?? ""} onChange={(e) => setBiz({ ...biz, rssbNumber: e.target.value })} />
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.sectionContact}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label={t.settings.phone} name="phone" value={biz.phone ?? ""} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
                <Input label={t.settings.email} name="email" type="email" value={biz.email ?? ""} onChange={(e) => setBiz({ ...biz, email: e.target.value })} />
                <Input label={t.settings.website} name="website" value={biz.website ?? ""} onChange={(e) => setBiz({ ...biz, website: e.target.value })} />
                <Input label={t.settings.address} name="address" value={biz.address ?? ""} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
              </div>
            </div>

            {/* Banking Section */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.sectionBanking}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label={t.settings.bankName} name="bankName" value={biz.bankName ?? ""} onChange={(e) => setBiz({ ...biz, bankName: e.target.value })} />
                <Input label={t.settings.bankAccount} name="bankAccount" value={biz.bankAccount ?? ""} onChange={(e) => setBiz({ ...biz, bankAccount: e.target.value })} />
              </div>
            </div>

            {/* Receipt & Report Options Section */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.sectionReceiptOptions}</p>
              <ToggleRow label={t.settings.showOwnerOnReports} checked={biz.showOwnerOnReports} onChange={(v) => setBiz({ ...biz, showOwnerOnReports: v })} />
              <ToggleRow label={t.settings.showOwnerOnReceipts} checked={biz.showOwnerOnReceipts} onChange={(v) => setBiz({ ...biz, showOwnerOnReceipts: v })} />
            </div>

            <SaveBar onSave={saveBusiness} saving={saving} label={t.common.save} />
          </div>
        </div>
      )}

      {/* ── Application tab ── */}
      {tab === 'application' && app && (
        <div className="card-base space-y-5 p-6">
          <SectionHeader icon={SlidersHorizontal} title="Application Settings" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label={t.settings.language} name="lang" value={app.language}
              onChange={(e) => setApp({ ...app, language: e.target.value as 'en' | 'rw' })}
              options={[{ value: 'en', label: t.language.english }, { value: 'rw', label: t.language.kinyarwanda }]} />
            <Select label={t.settings.theme} name="theme" value={app.theme}
              onChange={(e) => setApp({ ...app, theme: e.target.value as 'light' | 'dark' })}
              options={[{ value: 'light', label: t.theme.light }, { value: 'dark', label: t.theme.dark }]} />
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Primary Color</div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['teal', '#0d9488'], ['blue', '#2563eb'], ['indigo', '#4f46e5'],
                  ['violet', '#7c3aed'], ['cyan', '#0891b2'], ['orange', '#ea580c'],
                  ['emerald', '#059669'], ['rose', '#e11d48'], ['amber', '#d97706'], ['fuchsia', '#c026d3'],
                ].map(([value, color]) => (
                  <button key={value} type="button" onClick={() => setAccent(value as Accent)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${accent === value ? 'border-slate-900 ring-2 ring-slate-300 dark:border-white dark:ring-slate-600' : 'border-slate-200 dark:border-slate-700'}`}>
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />{value}
                  </button>
                ))}
              </div>
            </div>
            <Select label={t.settings.dateFormat} name="df" value={app.dateFormat}
              onChange={(e) => setApp({ ...app, dateFormat: e.target.value })}
              options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }]} />
            <Select label={t.settings.receiptWidth} name="rw" value={app.receiptWidth}
              onChange={(e) => setApp({ ...app, receiptWidth: e.target.value as '58mm' | '80mm' })}
              options={[{ value: '58mm', label: '58mm' }, { value: '80mm', label: '80mm' }]} />
            <Select label={t.settings.paperSize} name="ps" value={app.reportPaperSize}
              onChange={(e) => setApp({ ...app, reportPaperSize: e.target.value as 'a4' | 'a5' })}
              options={[{ value: 'a4', label: 'A4 (210×297mm)' }, { value: 'a5', label: 'A5 (148×210mm)' }]} />
            <Select label="Startup Page" name="sp" value={app.startupPage}
              onChange={(e) => setApp({ ...app, startupPage: e.target.value })}
              options={[
                { value: 'dashboard', label: 'Dashboard' },
                { value: 'customers', label: 'Customers' },
                { value: 'debts', label: 'Debts' },
                { value: 'reports', label: 'Reports' },
              ]} />
          </div>

          <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.ui.automation}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Auto-print is opt-in. Turn on the document types you want to print automatically after saving.</p>
            <ToggleRow label={t.settings.autoPrintDebt} checked={app.autoPrintDebt}
              onChange={(v) => setApp({ ...app, autoPrintDebt: v })} />
            <ToggleRow label={t.settings.autoPrintPayment} checked={app.autoPrintPayment}
              onChange={(v) => setApp({ ...app, autoPrintPayment: v })} />
            <ToggleRow label="Auto Save" checked={app.autoSave}
              onChange={(v) => setApp({ ...app, autoSave: v })} />
          </div>

          <SaveBar onSave={saveApp} saving={saving} label={t.common.save} />
        </div>
      )}

      {/* ── Receipt tab ── */}
      {tab === 'receipt' && app && (
        <div className="card-base space-y-5 p-6">
          <SectionHeader icon={Receipt} title="Receipt Configuration" />

          <Input label="Receipt Header" name="rh" value={app.receiptHeader ?? ''}
            onChange={(e) => setApp({ ...app, receiptHeader: e.target.value })}
            placeholder="Optional header text on receipts" />

          <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.ui.receiptElements}</p>
            <ToggleRow label="Show Logo on Receipt" checked={app.receiptShowLogo}
              onChange={(v) => setApp({ ...app, receiptShowLogo: v })} />
            <ToggleRow label="Show Signature Line" checked={app.receiptShowSignature}
              onChange={(v) => setApp({ ...app, receiptShowSignature: v })} />
            <ToggleRow label="Show Watermark" checked={app.receiptShowWatermark}
              onChange={(v) => setApp({ ...app, receiptShowWatermark: v })} />
          </div>

          <Input label="Watermark Text" name="wm" value={app.watermarkText ?? ''}
            onChange={(e) => setApp({ ...app, watermarkText: e.target.value })}
            placeholder="e.g. DRAFT, PAID, etc." />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Signature Name" name="sig" value={app.signatureName ?? ''}
              onChange={(e) => setApp({ ...app, signatureName: e.target.value })}
              placeholder="Person who signs receipts" />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={app.taxRate}
                onChange={(e) => setApp({ ...app, taxRate: Number(e.target.value) })}
                className="input-base" />
            </div>
          </div>

          <ToggleRow label="Enable Tax on Receipts" checked={app.taxEnabled}
            onChange={(v) => setApp({ ...app, taxEnabled: v })} />

          <SaveBar onSave={saveReceiptSettings} saving={saving} label={t.common.save} />
        </div>
      )}

      {/* ── Reports tab ── */}
      {tab === 'reports' && app && (
        <div className="card-base space-y-5 p-6">
          <SectionHeader icon={FileText} title="Report Configuration" />

          <Select label="Default Report" name="dr" value={app.defaultReport}
            onChange={(e) => setApp({ ...app, defaultReport: e.target.value })}
            options={[
              { value: 'customers', label: 'Customers' },
              { value: 'debtors', label: 'Debtors' },
              { value: 'products', label: 'Products' },
              { value: 'stock', label: 'Stock' },
              { value: 'payments', label: 'Payments' },
            ]} />

          <Input label="Report Header" name="rpth" value={app.reportHeader ?? ''}
            onChange={(e) => setApp({ ...app, reportHeader: e.target.value })}
            placeholder="Optional header text on all reports" />

          <Input label="Report Footer" name="rptf" value={app.reportFooter ?? ''}
            onChange={(e) => setApp({ ...app, reportFooter: e.target.value })}
            placeholder="Optional footer text on all reports" />

          <SaveBar onSave={saveReportSettings} saving={saving} label={t.common.save} />
        </div>
      )}

      {/* ── Security tab ── */}
      {tab === 'security' && app && (
        <div className="space-y-5">
          <div className="card-base space-y-5 p-6">
            <SectionHeader icon={Shield} title={t.settings.changePassword} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label={t.settings.currentPwd} type="password" name="cur" value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)} />
              <Input label={t.settings.newPwd} type="password" name="new" value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)} />
              <Input label={t.settings.confirmPwd} type="password" name="conf" value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button variant="amber" onClick={changePassword}>
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> {t.settings.updatePwd}</span>
              </Button>
            </div>
          </div>

          <div className="card-base space-y-5 p-6">
            <SectionHeader icon={Keyboard} title="PIN & Session" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="App PIN (4-6 digits)" type="password" name="pin" value={pin}
                onChange={(e) => setPin(e.target.value)} placeholder="Leave empty to keep current"
                hint="PIN protects sensitive actions" />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Session Timeout (minutes)</label>
                <input type="number" min="1" max="1440" value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="input-base" />
              </div>
            </div>
            <SaveBar onSave={saveSecuritySettings} saving={saving} label={t.common.save} />
          </div>

          <div className="card-base space-y-4 p-6">
            <SectionHeader icon={AlertCircle} title={t.settings.danger} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.logoutAll}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.settings.logoutAllHint}</p>
              </div>
              <Button variant="secondary" onClick={logout}>
                <span className="flex items-center gap-1.5"><LogOut className="h-4 w-4" /> {t.settings.logoutAll}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Database tab ── */}
      {tab === 'database' && (
        <div className="space-y-5">
          <div className="card-base p-6">
            <SectionHeader icon={DbIcon} title={t.settings.dbInfo} />
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatBox icon={HardDrive} label={t.settings.dbSize} value={dbLoading ? '…' : dbInfo?.size ?? '—'} />
              <StatBox icon={FileText} label={t.settings.totalRecords} value={dbLoading ? '…' : String(dbInfo?.totalRecords ?? '—')} />
            </div>
            {!dbLoading && dbInfo && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-700">
                    <tr><th className="py-2 font-semibold text-slate-600 dark:text-slate-300">{t.settings.table}</th><th className="py-2 text-right font-semibold text-slate-600 dark:text-slate-300">{t.settings.records}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {dbInfo.tables.map((tb) => (
                      <tr key={tb.name}><td className="py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{tb.name}</td><td className="py-2 text-right text-slate-700 dark:text-slate-300">{tb.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={loadDbInfo}>
                <span className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> {t.settings.refresh}</span>
              </Button>
            </div>
          </div>

          {health && (
            <div className="card-base p-6">
              <SectionHeader icon={CheckCircle2} title="Database Health Check" />
              <div className="mt-4 space-y-2">
                {health.checks.map((check) => (
                  <div key={check.name} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2.5 dark:bg-slate-700/30">
                    {check.passed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{check.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={runHealthCheck}>
                  <span className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> Re-run Health Check</span>
                </Button>
              </div>
            </div>
          )}

          <div className="card-base p-6">
            <SectionHeader icon={DbIcon} title={t.settings.dbOps} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="secondary" onClick={handleBackup}>
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> {t.settings.manualBackup}</span>
              </Button>
              <Button variant="secondary" onClick={handleRestore}>
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> {t.settings.restoreBackup}</span>
              </Button>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4" /> {t.settings.resetApp}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Backup/Restore tab ── */}
      {tab === 'backup' && autoBackup && (
        <div className="card-base space-y-5 p-6">
          <SectionHeader icon={HardDrive} title="Auto-Backup Configuration" />

          <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
            <ToggleRow label="Enable Auto-Backup" checked={autoBackup.enabled}
              onChange={(v) => setAutoBackup({ ...autoBackup, enabled: v })} />
            <ToggleRow label="Minimize to Tray on Close" checked={app?.minimizeToTray ?? true}
              onChange={(v) => { if (app) setApp({ ...app, minimizeToTray: v }); }} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t.ui.backupFolder}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={autoBackup.folderPath ?? ''}
                readOnly
                placeholder="Select a folder where backups will be saved"
                className="input-base flex-1"
              />
              <Button variant="secondary" onClick={selectBackupFolder}>
                <span className="flex items-center gap-1.5"><FolderOpen className="h-4 w-4" /> Browse</span>
              </Button>
            </div>
            {autoBackup.lastBackup && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                Last auto-backup: {new Date(autoBackup.lastBackup).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Backup Interval (minutes)
            </label>
            <input type="number" min="5" max="1440" value={autoBackup.intervalMinutes}
              onChange={(e) => setAutoBackup({ ...autoBackup, intervalMinutes: Number(e.target.value) })}
              className="input-base max-w-[200px]" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Max Backup Files to Keep
            </label>
            <input type="number" min="1" max="20" value={autoBackup.maxBackups}
              onChange={(e) => setAutoBackup({ ...autoBackup, maxBackups: Number(e.target.value) })}
              className="input-base max-w-[200px]" />
            <p className="mt-1 text-xs text-slate-400">{t.ui.olderBackupsHint}</p>
          </div>

          <SaveBar onSave={saveAutoBackup} saving={false} label="Save Auto-Backup" />

          <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleBackup}>
                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Manual Backup Now</span>
              </Button>
              <Button variant="secondary" onClick={handleRestore}>
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Restore from File</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── About tab ── */}
      {tab === 'about' && (
        <div className="space-y-5">
          <div className="card-base p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-600 shadow-lg">
                <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none">
                  <path d="M20 44V20h10a6 6 0 0 1 0 12h-4" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="44" cy="42" r="3" fill="#facc15" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Ikaze Ledger</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ikaze Ledger — Debt Management System</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Version {APP_VERSION}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Ikaze Ledger is an offline-first debt and customer management application built for small and medium businesses. It lets you record customer debts, track partial and full payments, manage product inventory and services, issue professional proforma invoices, and generate printable reports and receipts — all without an internet connection. Your data stays securely on your device, with built-in backup and restore for peace of mind.
              </p>
              <div className="mt-4 rounded-lg bg-teal-50 px-6 py-2 text-sm font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                Powered by MUD
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <SectionHeader icon={User} title="Developer Information" />
            <div className="mt-4 space-y-3">
              <InfoRow icon={User} label="Developer" value={DEVELOPER} />
              <InfoRow icon={Phone} label="Contact" value={DEVELOPER_PHONE} />
              <InfoRow icon={Info} label="Organization" value="MUD" />
              <InfoRow icon={Info} label="License" value="Proprietary — All rights reserved" />
            </div>
          </div>

          <div className="card-base p-6">
            <SectionHeader icon={Power} title="Application Updates" />
            <div className="mt-4 flex flex-col items-start gap-4">
              {updateInfo?.available ? (
                <div className="w-full rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
                  <p className="font-semibold text-blue-700 dark:text-blue-300">
                    Update {updateInfo.version} is available
                  </p>
                  {updateInfo.body && (
                    <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">{updateInfo.body}</p>
                  )}
                  <Button className="mt-3" onClick={handleInstallUpdate}>
                    <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download & Install</span>
                  </Button>
                </div>
              ) : updateInfo && !updateInfo.available ? (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> You are running the latest version ({APP_VERSION})
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Click "Check for Updates" to see if a new version is available.
                </p>
              )}
              <Button variant="secondary" onClick={handleCheckUpdate} disabled={checkingUpdate}>
                <span className="flex items-center gap-2">
                  {checkingUpdate ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                  Check for Updates
                </span>
              </Button>
            </div>
          </div>

          <div className="card-base p-6">
            <div className="text-center text-xs text-slate-400 dark:text-slate-500">
              <p>© 2026 MUD — {DEVELOPER}. All rights reserved.</p>
              <p className="mt-1">{t.ui.poweredByMudShort}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation modal */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={t.settings.resetApp}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/30">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{t.settings.resetConfirm}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>{t.common.cancel}</Button>
            <Button variant="danger" onClick={handleReset}>{t.settings.resetApp}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Building2; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-700">
      <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
      <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-desk-sm transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      } mt-0.5`} />
    </button>
  );
}

function SaveBar({ onSave, saving, label }: { onSave: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-700">
      <Button variant="amber" onClick={onSave} disabled={saving}>
        <span className="flex items-center gap-2">
          {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />} {label}
        </span>
      </Button>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: typeof HardDrive; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/30">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

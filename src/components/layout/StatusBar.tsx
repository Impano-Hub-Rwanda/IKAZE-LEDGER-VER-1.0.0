import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Database, Wifi, WifiOff } from 'lucide-react';
import { isTauri } from '../../lib/tauri';

interface StatusBarProps {
  dbStatus: 'healthy' | 'warning' | 'error';
  lastBackup: string | null;
}

export function StatusBar({ dbStatus, lastBackup }: StatusBarProps) {
  const [desktop, setDesktop] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setDesktop(isTauri());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusIcon = dbStatus === 'healthy' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : dbStatus === 'warning' ? <AlertCircle className="h-3.5 w-3.5 text-yellow-600" /> : <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
  const statusText = dbStatus === 'healthy' ? 'Connected' : dbStatus === 'warning' ? 'Warning' : 'Error';

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          {statusIcon}
          <span className="font-medium">{statusText}</span>
        </span>
        {lastBackup && (
          <span className="hidden items-center gap-1 sm:flex">
            Last backup: {lastBackup}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        {desktop ? (
          <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
            <Wifi className="h-3 w-3" /> Desktop
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" /> Web
          </span>
        )}
        <span className="text-slate-400 dark:text-slate-500">Powered by MUD</span>
      </div>
    </footer>
  );
}

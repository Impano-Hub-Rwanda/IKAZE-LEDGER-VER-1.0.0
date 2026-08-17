import { useState, useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { CommandPalette } from '../CommandPalette';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { toggleTheme } = useTheme();

  useKeyboardShortcuts({
    onSearch: () => setPaletteOpen(true),
    onToggleTheme: toggleTheme,
    onPrint: () => window.print(),
  });

  // Listen for Ctrl+N "new item" events dispatched by pages
  useEffect(() => {
    const handler = () => setPaletteOpen(true);
    window.addEventListener('dms:new-item', handler);
    return () => window.removeEventListener('dms:new-item', handler);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
      <TitleBar />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-0 flex-1 flex-col lg:pl-60">
        <Header onMenuClick={() => setSidebarOpen(true)} onSearchClick={() => setPaletteOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
        <StatusBar dbStatus="healthy" lastBackup={null} />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

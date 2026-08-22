import { useEffect, useState, type ReactNode } from 'react';
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

  /*
   * Global keyboard shortcuts.
   *
   * These remain centralized here so individual pages
   * do not need to register duplicate listeners.
   */
  useKeyboardShortcuts({
    onSearch: () => setPaletteOpen(true),
    onToggleTheme: toggleTheme,
    onPrint: () => window.print(),
  });

  /*
   * Pages can dispatch:
   *
   * window.dispatchEvent(new Event('dms:new-item'));
   *
   * to open the global command palette.
   */
  useEffect(() => {
    const handleNewItem = () => {
      setPaletteOpen(true);
    };

    window.addEventListener('dms:new-item', handleNewItem);

    return () => {
      window.removeEventListener('dms:new-item', handleNewItem);
    };
  }, []);

  /*
   * Close the mobile sidebar when the viewport becomes desktop-sized.
   *
   * This prevents the mobile drawer state from remaining active
   * after resizing the application window.
   */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className="
        flex h-screen w-full
        flex-col overflow-hidden
        bg-slate-100 text-slate-700
        dark:bg-slate-900 dark:text-slate-300
      "
    >
      {/* =====================================================
          NATIVE DESKTOP TITLE BAR
         ===================================================== */}
      <TitleBar />

      {/* =====================================================
          APPLICATION SIDEBAR
         ===================================================== */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* =====================================================
          MAIN APPLICATION WORKSPACE

          The sidebar occupies 15rem on desktop.
          min-w-0 prevents large tables/forms from
          forcing the entire application wider.
         ===================================================== */}
      <div
        className="
          flex min-h-0 min-w-0
          flex-1 flex-col
          lg:pl-60
        "
      >
        {/* =================================================
            APPLICATION HEADER / TOOLBAR
           ================================================= */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setPaletteOpen(true)}
        />

        {/* =================================================
            SCROLLABLE APPLICATION WORKSPACE
           ================================================= */}
        <main
          className="
            min-h-0 min-w-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-contain
            scrollbar-thin
          "
        >
          <div
            className="
              mx-auto w-full max-w-[1440px]
              px-4 py-5
              sm:px-5 sm:py-6
              lg:px-8 lg:py-8
              xl:px-10
            "
          >
            {/* =================================================
                PAGE CONTENT

                Lightweight entrance animation.
                Only opacity + transform are animated,
                avoiding expensive layout animations.
               ================================================= */}
            <div className="animate-page-in min-w-0">
              {children}
            </div>
          </div>
        </main>

        {/* =================================================
            APPLICATION STATUS BAR
           ================================================= */}
        <StatusBar
          dbStatus="healthy"
          lastBackup={null}
        />
      </div>

      {/* =====================================================
          GLOBAL COMMAND PALETTE

          Rendered outside the scrolling workspace so
          overlays are not affected by page scrolling.
         ===================================================== */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}

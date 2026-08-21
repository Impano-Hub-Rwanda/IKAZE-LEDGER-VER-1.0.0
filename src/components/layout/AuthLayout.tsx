import type { ReactNode } from 'react';
import { Minus, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  const handleMinimize = async () => {
    try {
      const window = getCurrentWindow();
      await window.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div
      className="
        relative
        min-h-screen
        w-full
        overflow-hidden
        bg-[#EAF4F8]
      "
    >

      {/* =====================================================
          BACKGROUND GLOW
         ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -left-40
          -top-40
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#008CFF]
          opacity-[0.06]
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-40
          -right-40
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#20D878]
          opacity-[0.06]
          blur-3xl
        "
      />

      {/* =====================================================
          WINDOW CONTROLS
         ===================================================== */}

      <div
        className="
          fixed
          right-3
          top-3
          z-[100]
          flex
          items-center
          gap-1
        "
      >
        {/* MINIMIZE */}
        <button
          type="button"
          onClick={handleMinimize}
          aria-label="Minimize window"
          title="Minimize"
          className="
            flex
            h-9
            w-10
            items-center
            justify-center
            rounded-lg
            text-slate-500
            transition-all
            duration-150
            hover:bg-slate-200
            hover:text-slate-900
            active:scale-95
          "
        >
          <Minus
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>

        {/* CLOSE */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close window"
          title="Close"
          className="
            flex
            h-9
            w-10
            items-center
            justify-center
            rounded-lg
            text-slate-500
            transition-all
            duration-150
            hover:bg-red-50
            hover:text-red-600
            active:scale-95
          "
        >
          <X
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>
      </div>

      {/* =====================================================
          PARTNER
          ABSOLUTE -> DOES NOT PUSH LOGIN
         ===================================================== */}

      <div
        className="
          absolute
          left-[3vw]
          top-1/2
          z-20
          hidden
          w-[250px]
          -translate-y-1/2
          lg:block
          xl:left-[5vw]
          2xl:left-[8vw]
        "
      >
        <div
          className="
            flex
            flex-col
            items-center
          "
        >

          {/* Partner card */}
          <div
            className="
              flex
              h-[180px]
              w-[250px]
              items-center
              justify-center
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-lg
              shadow-slate-300/25
            "
          >
            <img
              src="/partner-logo.png"
              alt="Our Partner"
              className="
                max-h-[145px]
                max-w-[220px]
                object-contain
              "
            />
          </div>

          {/* Partner label */}
          <div
            className="
              mt-3
              flex
              items-center
              gap-2
            "
          >
            <div
              className="
                h-px
                w-7
                bg-[#008CFF]
              "
            />

            <span
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.2em]
                text-slate-400
              "
            >
              Our Partner
            </span>

            <div
              className="
                h-px
                w-7
                bg-[#20D878]
              "
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          LOGIN AREA
          THIS REMAINS PERFECTLY CENTERED
         ===================================================== */}

      <div
        className="
          relative
          z-10
          flex
          min-h-screen
          w-full
          items-center
          justify-center
          px-4
          py-10
        "
      >
        <div className="w-full max-w-md">

          {/* =================================================
              IKAZE BRAND
             ================================================= */}

          <div
            className="
              mb-6
              flex
              flex-col
              items-center
              text-center
            "
          >

            {/* Small logo */}
            <div
              className="
                relative
                mb-3
                flex
                items-center
                justify-center
              "
            >
              <div
                className="
                  absolute
                  h-20
                  w-20
                  rounded-full
                  bg-[#008CFF]
                  opacity-10
                  blur-2xl
                "
              />

              <img
                src="/icon.svg"
                alt="Ikaze Ledger"
                className="
                  relative
                  h-14
                  w-14
                  object-contain
                  drop-shadow-md
                "
              />
            </div>

            {/* Brand name */}
            <div
              className="
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <span
                className="
                  text-2xl
                  font-extrabold
                  tracking-[0.16em]
                  text-[#071A2D]
                "
              >
                IKAZE
              </span>

              <span
                className="
                  text-2xl
                  font-extrabold
                  tracking-[0.07em]
                  text-[#18B968]
                "
              >
                LEDGER
              </span>
            </div>

            {/* Brand line */}
            <div
              className="
                mt-1.5
                flex
                items-center
                gap-2
              "
            >
              <div
                className="
                  h-0.5
                  w-7
                  rounded-full
                  bg-[#008CFF]
                "
              />

              <span
                className="
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-slate-500
                "
              >
                Smart Business Management
              </span>

              <div
                className="
                  h-0.5
                  w-7
                  rounded-full
                  bg-[#20D878]
                "
              />
            </div>

            {/* Page title */}
            <h1
              className="
                mt-4
                text-xl
                font-bold
                text-[#071A2D]
              "
            >
              {title}
            </h1>

            {subtitle && (
              <p
                className="
                  mt-1
                  max-w-sm
                  text-sm
                  text-slate-500
                "
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* =================================================
              AUTH CARD
             ================================================= */}

          <div
            className="
              relative
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-6
              shadow-xl
              shadow-slate-300/30
              sm:p-8
            "
          >

            {/* Brand line */}
            <div
              className="
                absolute
                left-0
                right-0
                top-0
                h-1
                bg-gradient-to-r
                from-[#008CFF]
                via-[#008CFF]
                to-[#20D878]
              "
            />

            {children}
          </div>

          {/* =================================================
              OFFLINE STATUS
             ================================================= */}

          <div
            className="
              mt-4
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <span
              className="
                h-2
                w-2
                rounded-full
                bg-[#20D878]
                shadow-sm
                shadow-[#20D878]
              "
            />

            <span
              className="
                text-[10px]
                font-medium
                tracking-wide
                text-slate-500
              "
            >
              Offline · Secure · Local Software
            </span>
          </div>

          {/* =================================================
              POWERED BY
             ================================================= */}

          <p
            className="
              mt-2
              text-center
              text-[10px]
              font-medium
              tracking-wide
              text-slate-400
            "
          >
            Powered by{' '}
            <span
              className="
                font-bold
                text-[#071A2D]
              "
            >
              MUD SOFTWARE COMPANY
            </span>
          </p>

          <p
            className="
              mt-1
              text-center
              text-[9px]
              text-slate-400
            "
          >
            IKAZE Ledger
          </p>
        </div>
      </div>
    </div>
  );
}

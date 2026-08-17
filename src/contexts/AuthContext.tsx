import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { Session, User } from '../types/auth';
import { getDb } from '../lib/database';
import { verifyPassword } from '../utils/crypto';
import { hasAnyUser } from '../database/seed';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  dbReady: boolean;
  locked: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshSetupFlag: () => Promise<void>;
  setUser: (u: User | null) => void;
  unlock: (pinOrPassword: string) => Promise<{ ok: boolean; error?: string }>;
  verifyPin: (pin: string) => Promise<boolean>;
  hasPin: () => Promise<boolean>;
  resetActivityTimer: () => void;
  clearLockTimeout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'dms-session';
const LOCK_KEY = 'dms-locked';
const LAST_PAGE_KEY = 'dms-locked-page';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'employee';
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Read the persisted lock state from localStorage synchronously on init.
 * This prevents the lock screen from being bypassed via refresh/restart.
 */
function getInitialLockState(): boolean {
  try {
    return localStorage.getItem(LOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function AuthProvider({ dbReady, children }: { dbReady: boolean; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  // Lock state is initialized from localStorage — survives refresh/restart
  const [locked, setLocked] = useState<boolean>(getInitialLockState);

  // Timer refs
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedTimeoutMinutes = useRef<number>(-1);
  const lastActivityReset = useRef<number>(0);

  // Persist lock state to localStorage whenever it changes
  const updateLockState = useCallback((isLocked: boolean) => {
    setLocked(isLocked);
    try {
      if (isLocked) {
        localStorage.setItem(LOCK_KEY, 'true');
      } else {
        localStorage.removeItem(LOCK_KEY);
      }
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }, []);

  const refreshSetupFlag = useCallback(async () => {
    const db = getDb();
    const exists = await hasAnyUser(db);
    setNeedsSetup(!exists);
  }, []);

  // On mount (once DB is ready): restore session from storage, check if setup needed
  useEffect(() => {
    if (!dbReady) return;
    let cancelled = false;

    (async () => {
      try {
        const db = getDb();
        const exists = await hasAnyUser(db);
        if (cancelled) return;
        setNeedsSetup(!exists);

        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed: Session = JSON.parse(stored);
          const result = await db.query<UserRow>(
            'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
            [parsed.userId],
          );
          if (cancelled) return;
          if (result.rows.length === 1) {
            const row = result.rows[0];
            const restoredUser: User = { ...row };
            const newSession: Session = {
              userId: row.id,
              username: row.username,
              role: row.role,
              full_name: row.full_name,
              loginAt: parsed.loginAt,
            };
            setUserState(restoredUser);
            setSession(newSession);
          } else {
            // Session is invalid — clear it AND lock the app
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dbReady]);

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const db = getDb();
      const result = await db.query<UserRow>(
        'SELECT * FROM users WHERE username = $1',
        [username.trim()],
      );
      if (result.rows.length === 0) {
        return { ok: false };
      }
      const row = result.rows[0];
      if (!row.is_active) {
        return { ok: false, error: 'inactive' };
      }
      const valid = await verifyPassword(password, row.password_hash);
      if (!valid) {
        return { ok: false };
      }
      const loggedInUser: User = { ...row };
      const newSession: Session = {
        userId: row.id,
        username: row.username,
        role: row.role,
        full_name: row.full_name,
        loginAt: new Date().toISOString(),
      };
      setUserState(loggedInUser);
      setSession(newSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      // Clear any stale lock state on fresh login
      updateLockState(false);
      return { ok: true };
    },
    [updateLockState],
  );

  // Fetch timeout minutes once and cache; re-fetch when cache is invalidated
  const ensureTimeoutCached = useCallback(async (): Promise<number> => {
    if (cachedTimeoutMinutes.current >= 0) return cachedTimeoutMinutes.current;
    try {
      const db = getDb();
      const r = await db.query<{ session_timeout_minutes: number }>(
        'SELECT session_timeout_minutes FROM settings WHERE id=1',
      );
      const minutes = r.rows.length > 0 ? r.rows[0].session_timeout_minutes : 0;
      cachedTimeoutMinutes.current = minutes;
      return minutes;
    } catch {
      return 0;
    }
  }, []);

  /**
   * Resets the inactivity timer. Called on user activity events.
   * Throttled to at most once every 10 seconds to avoid excessive timer resets
   * during continuous activity (scrolling, typing, mouse movement).
   */
  const resetActivityTimer = useCallback(() => {
    if (!session || locked) return;

    const now = Date.now();
    if (now - lastActivityReset.current < 10000) return;
    lastActivityReset.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    void (async () => {
      const minutes = await ensureTimeoutCached();
      if (minutes > 0 && session && !locked) {
        timeoutRef.current = setTimeout(() => {
          updateLockState(true);
        }, minutes * 60 * 1000);
      }
    })();
  }, [session, locked, ensureTimeoutCached, updateLockState]);

  /**
   * Clears the lock timeout timer (e.g. when logging out or locking manually).
   */
  const clearLockTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Track user activity to reset timer.
  // Uses { passive: true } to avoid blocking scroll/render.
  // Events: mousemove, keydown, click, scroll, touchstart, wheel.
  useEffect(() => {
    if (!session || locked) return;

    const handler = () => resetActivityTimer();

    // Use a single shared handler for all events
    const events: Array<keyof WindowEventMap> = [
      'mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'wheel',
    ];
    for (const evt of events) {
      window.addEventListener(evt, handler, { passive: true });
    }

    // Also detect visibility change — if user comes back after tab switch,
    // reset the timer immediately
    const onVisible = () => {
      if (document.visibilityState === 'visible') resetActivityTimer();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, handler);
      }
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session, locked, resetActivityTimer]);

  // Start/restart timer when session or lock state changes
  useEffect(() => {
    if (session && !locked) {
      lastActivityReset.current = 0; // force immediate reset
      resetActivityTimer();
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [session, locked, resetActivityTimer]);

  // Invalidate cached timeout when settings change
  const refreshTimeoutCache = useCallback(() => {
    cachedTimeoutMinutes.current = -1;
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const db = getDb();
      const r = await db.query<{ pin_hash: string }>(
        'SELECT pin_hash FROM settings WHERE id=1',
      );
      if (r.rows.length === 0 || !r.rows[0].pin_hash) return false;
      return verifyPassword(pin, r.rows[0].pin_hash);
    } catch { return false; }
  }, []);

  const hasPin = useCallback(async (): Promise<boolean> => {
    try {
      const db = getDb();
      const r = await db.query<{ pin_hash: string }>(
        'SELECT pin_hash FROM settings WHERE id=1',
      );
      return r.rows.length > 0 && !!r.rows[0].pin_hash;
    } catch { return false; }
  }, []);

  const unlock = useCallback(async (pinOrPassword: string): Promise<{ ok: boolean; error?: string }> => {
    const pinOk = await verifyPin(pinOrPassword);
    if (pinOk) {
      updateLockState(false);
      lastActivityReset.current = 0;
      resetActivityTimer();
      return { ok: true };
    }
    if (user) {
      const db = getDb();
      const r = await db.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id=$1',
        [user.id],
      );
      if (r.rows.length > 0) {
        const ok = await verifyPassword(pinOrPassword, r.rows[0].password_hash);
        if (ok) {
          updateLockState(false);
          lastActivityReset.current = 0;
          resetActivityTimer();
          return { ok: true };
        }
      }
    }
    return { ok: false, error: 'Invalid PIN or password' };
  }, [user, verifyPin, resetActivityTimer, updateLockState]);

  const logout = useCallback(() => {
    clearLockTimeout();
    setUserState(null);
    setSession(null);
    updateLockState(false);
    localStorage.removeItem(SESSION_KEY);
    refreshTimeoutCache();
  }, [clearLockTimeout, updateLockState, refreshTimeoutCache]);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      needsSetup,
      dbReady,
      locked,
      login,
      logout,
      refreshSetupFlag,
      setUser,
      unlock,
      verifyPin,
      hasPin,
      resetActivityTimer,
      clearLockTimeout,
    }),
    [session, user, loading, needsSetup, dbReady, locked, login, logout, refreshSetupFlag, setUser, unlock, verifyPin, hasPin, resetActivityTimer, clearLockTimeout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Saves the current page path to localStorage so it can be restored after unlock.
 */
export function saveLockedPage(path: string): void {
  try {
    localStorage.setItem(LAST_PAGE_KEY, path);
  } catch { /* ignore */ }
}

/**
 * Gets the page path to restore after unlock, then clears it.
 */
export function popLockedPage(): string | null {
  try {
    const path = localStorage.getItem(LAST_PAGE_KEY);
    if (path) localStorage.removeItem(LAST_PAGE_KEY);
    return path;
  } catch {
    return null;
  }
}

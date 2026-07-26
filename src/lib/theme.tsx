import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "teal" | "violet" | "rose" | "emerald" | "amber";

const STORAGE_KEY = "medfolio:theme";

type StoredPrefs = { mode: ThemeMode; accent: AccentColor };

function readStored(): StoredPrefs {
  if (typeof window === "undefined") return { mode: "system", accent: "blue" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "system", accent: "blue" };
    const parsed = JSON.parse(raw);
    return { mode: parsed.mode ?? "system", accent: parsed.accent ?? "blue" };
  } catch {
    return { mode: "system", accent: "blue" };
  }
}

function applyToDom(mode: ThemeMode, accent: AccentColor) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", resolvedDark);
  root.setAttribute("data-accent", accent);
}

type ThemeContextValue = {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
  /** Call once the logged-in user is known so their saved preference (cross-device) can be pulled in. */
  registerUser: (userId: string | undefined) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(() => readStored());
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Apply immediately on mount / whenever prefs change (also reacts to OS theme changes in "system" mode)
  useEffect(() => {
    applyToDom(prefs.mode, prefs.accent);
    if (prefs.mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyToDom(prefs.mode, prefs.accent);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [prefs]);

  // Once we know who's logged in, pull their saved preference (cross-device) and let it win.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("theme_mode, accent_color")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const next = { mode: (data.theme_mode as ThemeMode) ?? "system", accent: (data.accent_color as AccentColor) ?? "blue" };
        setPrefs(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    (next: StoredPrefs) => {
      setPrefs(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (userId) {
        supabase.from("profiles").update({ theme_mode: next.mode, accent_color: next.accent }).eq("id", userId).then();
      }
    },
    [userId],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: prefs.mode,
      accent: prefs.accent,
      setMode: (m) => persist({ ...prefs, mode: m }),
      setAccent: (a) => persist({ ...prefs, accent: a }),
      registerUser: setUserId,
    }),
    [prefs, persist],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>");
  return ctx;
}

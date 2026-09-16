import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { ThemeMode } from "../types";
import Api from "../api";

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  isDark: false,
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const VALID_MODES: ThemeMode[] = ["light", "dark", "system"];

const prefersDark = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolveDark = (mode: ThemeMode): boolean => {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return prefersDark();
};

const applyDarkClass = (dark: boolean) => {
  if (typeof document !== "undefined") {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

const STORAGE_KEY = "familynotes_theme";

const getStoredTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_MODES.includes(saved as ThemeMode)) {
      return saved as ThemeMode;
    }
  } catch {}
  return "system";
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(getStoredTheme);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const initial = getStoredTheme();
    const dark = resolveDark(initial);
    applyDarkClass(dark);
    return dark;
  });
  const modeRef = useRef<ThemeMode>(getStoredTheme());

  const apply = useCallback((m: ThemeMode) => {
    const dark = resolveDark(m);
    applyDarkClass(dark);
    setIsDark(dark);
  }, []);

  // Bootstrap from preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let chosen: ThemeMode = getStoredTheme();
      try {
        const rawStored = (() => {
          try {
            return localStorage.getItem(STORAGE_KEY);
          } catch {
            return null;
          }
        })();

        const prefs = await Api.getPreferences();
        if (rawStored && VALID_MODES.includes(rawStored as ThemeMode)) {
          chosen = rawStored as ThemeMode;
          if (prefs && prefs.theme !== chosen) {
            await Api.savePreferences({ ...prefs, theme: chosen });
          }
        } else if (prefs?.theme && VALID_MODES.includes(prefs.theme as ThemeMode)) {
          chosen = prefs.theme as ThemeMode;
          try {
            localStorage.setItem(STORAGE_KEY, chosen);
          } catch {}
        }
      } catch {
        chosen = getStoredTheme();
      }
      if (cancelled) return;
      modeRef.current = chosen;
      setModeState(chosen);
      apply(chosen);
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Follow OS theme changes when in "system" mode
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (modeRef.current === "system") {
        apply("system");
      }
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [apply]);

  const setMode = useCallback(
    (m: ThemeMode) => {
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {}
      modeRef.current = m;
      setModeState(m);
      apply(m);
      (async () => {
        try {
          const prefs = await Api.getPreferences();
          await Api.savePreferences({ ...prefs, theme: m });
        } catch (e) {
          console.error("Could not persist theme to preferences", e);
        }
      })();
    },
    [apply]
  );

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

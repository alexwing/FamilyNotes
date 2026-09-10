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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState<boolean>(() => resolveDark("system"));
  const modeRef = useRef<ThemeMode>("system");

  const apply = useCallback((m: ThemeMode) => {
    const dark = resolveDark(m);
    applyDarkClass(dark);
    setIsDark(dark);
  }, []);

  // Bootstrap from preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let chosen: ThemeMode = "system";
      try {
        const prefs = await Api.getPreferences();
        if (prefs?.theme && VALID_MODES.includes(prefs.theme as ThemeMode)) {
          chosen = prefs.theme as ThemeMode;
        }
      } catch {
        chosen = "system";
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

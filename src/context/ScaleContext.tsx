import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { UiScale } from "../types";
import Api from "../api";

export interface ScaleContextValue {
  scale: UiScale;
  setScale: (scale: UiScale) => void;
}

const STORAGE_KEY = "familynotes_ui_scale";
const VALID_SCALES: UiScale[] = ["normal", "large", "xlarge"];

const applyScaleAttribute = (scale: UiScale) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-ui-scale", scale);
  }
};

const getStoredScale = (): UiScale => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_SCALES.includes(saved as UiScale)) {
      return saved as UiScale;
    }
  } catch {}
  return "normal";
};

export const ScaleContext = createContext<ScaleContextValue>({
  scale: "normal",
  setScale: () => {},
});

export const useScale = () => useContext(ScaleContext);

export const ScaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScaleState] = useState<UiScale>(() => {
    const initial = getStoredScale();
    applyScaleAttribute(initial);
    return initial;
  });

  // Sync with backend preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawStored = (() => {
          try {
            return localStorage.getItem(STORAGE_KEY);
          } catch {
            return null;
          }
        })();

        const prefs = await Api.getPreferences();

        if (rawStored && VALID_SCALES.includes(rawStored as UiScale)) {
          const storedScale = rawStored as UiScale;
          if (prefs && prefs.uiScale !== storedScale) {
            await Api.savePreferences({ ...prefs, uiScale: storedScale });
          }
          if (!cancelled) {
            setScaleState(storedScale);
            applyScaleAttribute(storedScale);
          }
          return;
        }

        if (prefs?.uiScale && VALID_SCALES.includes(prefs.uiScale as UiScale)) {
          const chosen = prefs.uiScale as UiScale;
          if (!cancelled) {
            setScaleState(chosen);
            applyScaleAttribute(chosen);
            try {
              localStorage.setItem(STORAGE_KEY, chosen);
            } catch {}
          }
        }
      } catch (e) {
        console.warn("Could not sync UI scale with preferences:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setScale = useCallback((s: UiScale) => {
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {}
    setScaleState(s);
    applyScaleAttribute(s);
    (async () => {
      try {
        const prefs = await Api.getPreferences();
        await Api.savePreferences({ ...prefs, uiScale: s });
      } catch (e) {
        console.error("Could not persist UI scale to preferences", e);
      }
    })();
  }, []);

  const value = useMemo(() => ({ scale, setScale }), [scale, setScale]);

  return <ScaleContext.Provider value={value}>{children}</ScaleContext.Provider>;
};

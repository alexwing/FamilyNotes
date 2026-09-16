import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { SupportedLanguage, LanguageSetting, resolveLanguage, translate } from "../i18n";
import Api from "../api";

export interface LanguageContextValue {
  language: LanguageSetting;
  resolved: SupportedLanguage;
  setLanguage: (lang: LanguageSetting) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "familynotes_language";
const VALID_LANGUAGES: LanguageSetting[] = ["system", "es", "en"];

const getStoredLanguage = (): LanguageSetting => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_LANGUAGES.includes(saved as LanguageSetting)) {
      return saved as LanguageSetting;
    }
  } catch {}
  return "system";
};

export const LanguageContext = createContext<LanguageContextValue>({
  language: "system",
  resolved: "es",
  setLanguage: () => {},
  t: (key) => key,
});

export const useTranslation = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from localStorage prevents initial flash or race condition
  const [language, setLanguageState] = useState<LanguageSetting>(getStoredLanguage);
  const [resolved, setResolved] = useState<SupportedLanguage>(() =>
    resolveLanguage(getStoredLanguage())
  );

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

        // If localStorage has an explicit user choice, ensure backend matches
        if (rawStored && VALID_LANGUAGES.includes(rawStored as LanguageSetting)) {
          const storedLang = rawStored as LanguageSetting;
          if (prefs && prefs.language !== storedLang) {
            await Api.savePreferences({ ...prefs, language: storedLang });
          }
          if (!cancelled) {
            setLanguageState(storedLang);
            setResolved(resolveLanguage(storedLang));
          }
          return;
        }

        // If localStorage has not been set yet, check backend preferences
        if (prefs?.language && VALID_LANGUAGES.includes(prefs.language as LanguageSetting)) {
          const chosen = prefs.language as LanguageSetting;
          if (!cancelled) {
            setLanguageState(chosen);
            setResolved(resolveLanguage(chosen));
            try {
              localStorage.setItem(STORAGE_KEY, chosen);
            } catch {}
          }
        }
      } catch (e) {
        console.warn("Could not sync language with preferences:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((lang: LanguageSetting) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    setLanguageState(lang);
    setResolved(resolveLanguage(lang));
    (async () => {
      try {
        const prefs = await Api.getPreferences();
        await Api.savePreferences({ ...prefs, language: lang });
      } catch (e) {
        console.error("Could not persist language to preferences", e);
      }
    })();
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(resolved, key, vars),
    [resolved]
  );

  const value = useMemo(
    () => ({ language, resolved, setLanguage, t }),
    [language, resolved, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

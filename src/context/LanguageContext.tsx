import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { SupportedLanguage, LanguageSetting, resolveLanguage, translate } from "../i18n";
import Api from "../api";

export interface LanguageContextValue {
  language: LanguageSetting;
  resolved: SupportedLanguage;
  setLanguage: (lang: LanguageSetting) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: "system",
  resolved: "es",
  setLanguage: () => {},
  t: (key) => key,
});

export const useTranslation = () => useContext(LanguageContext);

const VALID_LANGUAGES: LanguageSetting[] = ["system", "es", "en"];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageSetting>("system");
  const [resolved, setResolved] = useState<SupportedLanguage>(resolveLanguage("system"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let chosen: LanguageSetting = "system";
      try {
        const prefs = await Api.getPreferences();
        if (prefs?.language && VALID_LANGUAGES.includes(prefs.language as LanguageSetting)) {
          chosen = prefs.language as LanguageSetting;
        }
      } catch {
        chosen = "system";
      }
      if (cancelled) return;
      setLanguageState(chosen);
      setResolved(resolveLanguage(chosen));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((lang: LanguageSetting) => {
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

import en from "./en";
import es from "./es";

type Stringify<T> = {
  [K in keyof T]: T[K] extends string ? string : Stringify<T[K]>;
};
export type Dict = Stringify<typeof en>;

export type SupportedLanguage = "en" | "es";
export type LanguageSetting = "system" | "en" | "es";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "es"];
export const DEFAULT_LANGUAGE: SupportedLanguage = "es";

export const dictionaries: Record<SupportedLanguage, Dict> = {
  en: en as Dict,
  es: es as Dict,
};

export const resolveLanguage = (
  setting: string | undefined | null
): SupportedLanguage => {
  if (setting && SUPPORTED_LANGUAGES.includes(setting as SupportedLanguage)) {
    return setting as SupportedLanguage;
  }
  const nav =
    typeof navigator !== "undefined"
      ? (navigator.language || "").slice(0, 2).toLowerCase()
      : "";
  if (SUPPORTED_LANGUAGES.includes(nav as SupportedLanguage)) return nav as SupportedLanguage;
  return DEFAULT_LANGUAGE;
};

const lookup = (dict: Dict, path: string): string | undefined => {
  let node: unknown = dict;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
};

export const translate = (
  language: SupportedLanguage,
  key: string,
  vars?: Record<string, string | number>
): string => {
  const raw =
    lookup(dictionaries[language], key) ??
    lookup(dictionaries[DEFAULT_LANGUAGE], key) ??
    key;
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{{${name}}}`
  );
};

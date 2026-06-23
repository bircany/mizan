"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type Locale = "tr" | "en" | "ar";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "mizan-locale";

// Lazy-load messages so we don't block render
const messagesCache: Record<string, Record<string, string>> = {};

async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  if (messagesCache[locale]) return messagesCache[locale];
  try {
    const module = await import(`@/messages/${locale}.json`);
    const flat: Record<string, string> = {};
    const flatten = (obj: Record<string, unknown>, prefix = "") => {
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === "object" && val !== null) {
          flatten(val as Record<string, unknown>, `${prefix}${key}.`);
        } else {
          flat[`${prefix}${key}`] = String(val);
        }
      }
    };
    flatten(module.default || module);
    messagesCache[locale] = flat;
    return flat;
  } catch {
    return {};
  }
}

const dirMap: Record<Locale, "ltr" | "rtl"> = {
  tr: "ltr",
  en: "ltr",
  ar: "rtl",
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && ["tr", "en", "ar"].includes(stored)) {
        setLocaleState(stored);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadMessages(locale).then(setMessages);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
    document.documentElement.lang = locale;
    document.documentElement.dir = dirMap[locale];
  }, [locale, ready]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string) => messages[key] || key,
    [messages]
  );

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, dir: dirMap[locale], t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

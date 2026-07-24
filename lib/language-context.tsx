"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import trMessages from "@/messages/tr.json";
import enMessages from "@/messages/en.json";
import arMessages from "@/messages/ar.json";

type Locale = "tr" | "en" | "ar";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "mizan-locale";

function flattenMessages(source: Record<string, unknown>) {
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
  flatten(source);
  return flat;
}

// Keeping the small language dictionaries in memory prevents untranslated keys
// from flashing while a visitor changes their language.
const messagesCache: Record<Locale, Record<string, string>> = {
  tr: flattenMessages(trMessages),
  en: flattenMessages(enMessages),
  ar: flattenMessages(arMessages),
};

async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  if (messagesCache[locale]) return messagesCache[locale];
  try {
    const messagesModule = await import(`@/messages/${locale}.json`);
    const flat = flattenMessages(messagesModule.default || messagesModule);
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
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>("tr");
  const [messages, setMessages] = useState<Record<string, string>>(messagesCache.tr);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (stored && ["tr", "en", "ar"].includes(stored)) setLocaleState(stored);
      } catch {}
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadMessages(locale).then(setMessages);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    document.documentElement.dir = dirMap[locale];
    router.refresh();
  }, [locale, ready, router]);

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

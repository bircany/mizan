import { cookies } from "next/headers";

export const supportedLocales = ["tr", "en", "ar"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && supportedLocales.includes(value as AppLocale);
}

export async function getPublicLocale(): Promise<AppLocale> {
  const locale = (await cookies()).get("mizan-locale")?.value;
  return isAppLocale(locale) ? locale : "tr";
}

export function localeTag(locale: AppLocale) {
  return locale === "tr" ? "tr-TR" : locale === "ar" ? "ar" : "en-US";
}

import { en, type Translations } from "./en";
import { de } from "./de";
import { tr } from "./tr";
import { fr } from "./fr";
import { it } from "./it";
import { ar } from "./ar";
import { ja } from "./ja";

export type Locale = "en" | "de" | "tr" | "fr" | "it" | "ar" | "ja";

export const translations: Record<Locale, Translations> = {
  en,
  de,
  tr,
  fr,
  it,
  ar,
  ja,
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
  fr: "Français",
  it: "Italiano",
  ar: "العربية",
  ja: "日本語",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
  tr: "🇹🇷",
  fr: "🇫🇷",
  it: "🇮🇹",
  ar: "🇸🇦",
  ja: "🇯🇵",
};

export type { Translations };

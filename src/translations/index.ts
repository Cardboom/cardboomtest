import { en, type Translations } from "./en";
import { de } from "./de";
import { tr } from "./tr";
import { fr } from "./fr";
import { it } from "./it";
import { ar } from "./ar";
import { ja } from "./ja";
import { ko } from "./ko";
import { nl } from "./nl";

export type Locale = "en" | "de" | "tr" | "fr" | "it" | "ar" | "ja" | "ko" | "nl";

export const translations: Record<Locale, Translations> = {
  en,
  de,
  tr,
  fr,
  it,
  ar,
  ja,
  ko,
  nl,
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
  fr: "Français",
  it: "Italiano",
  ar: "العربية",
  ja: "日本語",
  ko: "한국어",
  nl: "Nederlands",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
  tr: "🇹🇷",
  fr: "🇫🇷",
  it: "🇮🇹",
  ar: "🇸🇦",
  ja: "🇯🇵",
  ko: "🇰🇷",
  nl: "🇳🇱",
};

export type { Translations };

import { en, type Translations } from "./en";
import { de } from "./de";
import { tr } from "./tr";
import { fr } from "./fr";

export type Locale = "en" | "de" | "tr" | "fr";

export const translations: Record<Locale, Translations> = {
  en,
  de,
  tr,
  fr,
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
  fr: "Français",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
  tr: "🇹🇷",
  fr: "🇫🇷",
};

export type { Translations };

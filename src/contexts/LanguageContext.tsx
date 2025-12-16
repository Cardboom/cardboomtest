import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Locale, type Translations } from "@/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  isLoading: boolean;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "cardboom_locale";

// RTL languages
const RTL_LOCALES: Locale[] = ["ar"];

// Map country codes to locales
const countryToLocale: Record<string, Locale> = {
  DE: "de",
  AT: "de",
  CH: "de",
  TR: "tr",
  FR: "fr",
  BE: "fr",
  CA: "fr",
  IT: "it",
  SM: "it",
  VA: "it",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  MA: "ar",
  DZ: "ar",
  IQ: "ar",
  JO: "ar",
  KW: "ar",
  LB: "ar",
  LY: "ar",
  OM: "ar",
  QA: "ar",
  SY: "ar",
  YE: "ar",
  BH: "ar",
  // Default to English for all others
};

function detectLocaleFromBrowser(): Locale {
  try {
    // Use browser's language setting (more reliable and secure than IP-based detection)
    const browserLang = navigator.language || (navigator as any).userLanguage || "en";
    const langCode = browserLang.split("-")[0].toLowerCase();
    
    // Map browser language codes to our supported locales
    const langToLocale: Record<string, Locale> = {
      "tr": "tr",
      "de": "de",
      "fr": "fr",
      "it": "it",
      "ar": "ar",
      "en": "en",
    };
    
    return langToLocale[langCode] || "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initLocale = async () => {
      // Check localStorage first
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      
      if (stored && translations[stored]) {
        setLocaleState(stored);
        setIsLoading(false);
        return;
      }

      // Detect from browser language
      const detected = detectLocaleFromBrowser();
      setLocaleState(detected);
      localStorage.setItem(LOCALE_STORAGE_KEY, detected);
      setIsLoading(false);
    };

    initLocale();
  }, []);

  // Update document direction for RTL languages
  useEffect(() => {
    const isRTL = RTL_LOCALES.includes(locale);
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  };

  const isRTL = RTL_LOCALES.includes(locale);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t: translations[locale],
        isLoading,
        isRTL,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

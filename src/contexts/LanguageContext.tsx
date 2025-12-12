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

async function detectLocaleFromIP(): Promise<Locale> {
  try {
    // Use ip-api.com (free, no API key required)
    const response = await fetch("http://ip-api.com/json/?fields=countryCode", {
      signal: AbortSignal.timeout(3000),
    });
    
    if (!response.ok) return "en";
    
    const data = await response.json();
    const countryCode = data.countryCode as string;
    
    return countryToLocale[countryCode] || "en";
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

      // Detect from IP
      const detected = await detectLocaleFromIP();
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

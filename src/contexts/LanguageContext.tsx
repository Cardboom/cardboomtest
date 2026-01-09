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
  JP: "ja",
  KR: "ko",
  // Default to English for all others
};

// ISO 639-1 language codes mapped to supported locales
const ISO_639_1_TO_LOCALE: Record<string, Locale> = {
  "tr": "tr", // Turkish
  "de": "de", // German
  "fr": "fr", // French
  "it": "it", // Italian
  "ar": "ar", // Arabic
  "en": "en", // English
  "ja": "ja", // Japanese
  "ko": "ko", // Korean
};

// BCP 47 / IETF language tag parser (ISO 639-1 + optional ISO 3166-1 country code)
function parseLanguageTag(tag: string): { language: string; region?: string } {
  const normalized = tag.toLowerCase().replace(/_/g, "-");
  const [language, region] = normalized.split("-");
  return { language: language || "en", region: region?.toUpperCase() };
}

function detectLocaleFromBrowser(): Locale {
  try {
    // Get browser languages in order of preference (BCP 47 compliant)
    const languages = navigator.languages?.length 
      ? navigator.languages 
      : [navigator.language || (navigator as any).userLanguage || "en"];
    
    // Try each preferred language in order
    for (const langTag of languages) {
      const { language } = parseLanguageTag(langTag);
      
      // Check if we support this ISO 639-1 language code
      if (ISO_639_1_TO_LOCALE[language]) {
        return ISO_639_1_TO_LOCALE[language];
      }
    }
    
    return "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initLocale = async () => {
      try {
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
        try {
          localStorage.setItem(LOCALE_STORAGE_KEY, detected);
        } catch {
          // Private browsing mode - ignore
        }
      } catch {
        // Fallback to English on any error
        setLocaleState("en");
      } finally {
        setIsLoading(false);
      }
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
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // Private browsing mode - ignore
    }
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

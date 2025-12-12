import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Locale, type Translations } from "@/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "cardboom_locale";

// Map country codes to locales
const countryToLocale: Record<string, Locale> = {
  DE: "de",
  AT: "de",
  CH: "de",
  TR: "tr",
  FR: "fr",
  BE: "fr",
  CA: "fr",
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

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t: translations[locale],
        isLoading,
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

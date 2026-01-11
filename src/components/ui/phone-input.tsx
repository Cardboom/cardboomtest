import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Search } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
];

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullNumber: string, countryCode: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export const PhoneInputWithCountry = ({
  value,
  onChange,
  placeholder = 'Phone number',
  className = '',
  error,
}: PhoneInputWithCountryProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Default Turkey

  // Auto-detect country from input
  const handleInputChange = (input: string) => {
    // Remove all non-numeric except +
    let cleaned = input.replace(/[^\d+]/g, '');
    
    // If starts with +, try to detect country
    if (cleaned.startsWith('+')) {
      for (const country of countries) {
        if (cleaned.startsWith(country.dial)) {
          if (selectedCountry.dial !== country.dial) {
            setSelectedCountry(country);
          }
          // Remove country code from display
          const localNumber = cleaned.slice(country.dial.length);
          onChange(cleaned, country.dial);
          return;
        }
      }
    }
    
    // If just numbers, prepend country code
    const localNumber = cleaned.replace(/^\+/, '');
    onChange(selectedCountry.dial + localNumber, selectedCountry.dial);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    // Update phone with new country code
    const localPart = value.replace(selectedCountry.dial, '').replace(/^\+\d+/, '');
    onChange(country.dial + localPart, country.dial);
  };

  // Get display value (without country code)
  const displayValue = value.startsWith(selectedCountry.dial) 
    ? value.slice(selectedCountry.dial.length) 
    : value.replace(/^\+\d+/, '');

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 px-3 flex items-center gap-2 bg-secondary/50 border-border/50 hover:bg-secondary/70 rounded-xl min-w-[100px]"
            >
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-sm font-medium">{selectedCountry.dial}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search countries..."
                className="pl-8 h-9"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-muted transition-colors ${
                    selectedCountry.code === country.code ? 'bg-muted' : ''
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1 text-sm">{country.name}</span>
                  <span className="text-xs text-muted-foreground">{country.dial}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          type="tel"
          value={displayValue}
          onChange={(e) => handleInputChange(selectedCountry.dial + e.target.value.replace(/\D/g, ''))}
          placeholder={placeholder}
          className="h-12 flex-1 bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
          maxLength={15}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
};

// Helper to detect country from phone number
export const detectCountryFromPhone = (phone: string): Country | null => {
  for (const country of countries) {
    if (phone.startsWith(country.dial)) {
      return country;
    }
  }
  return null;
};

export { countries };
export type { Country };

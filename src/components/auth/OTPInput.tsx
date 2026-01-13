import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OTPInput = ({
  value,
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = true,
}: OTPInputProps) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  // Sync input values with value prop
  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;
    
    // Only allow single digit
    const sanitized = digit.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...digits];
    newDigits[index] = sanitized;
    onChange(newDigits.join(''));

    // Auto-focus next input
    if (sanitized && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);

    // Focus last filled input or the one after
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2 sm:gap-3">
        {digits.map((digit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <input
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              disabled={disabled}
              className={cn(
                "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold",
                "bg-secondary/50 border-2 rounded-xl transition-all duration-200",
                "focus:outline-none focus:ring-0",
                focusedIndex === index
                  ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary)/0.2)]"
                  : digit
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50",
                error && "border-destructive/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              maxLength={1}
            />
          </motion.div>
        ))}
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-destructive text-sm text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Progress indicator */}
      <div className="flex justify-center gap-1 mt-2">
        {digits.map((digit, index) => (
          <motion.div
            key={index}
            className={cn(
              "w-2 h-1 rounded-full transition-all duration-300",
              digit ? "bg-primary" : "bg-border/50"
            )}
            animate={{ scale: digit ? 1.2 : 1 }}
          />
        ))}
      </div>
    </div>
  );
};
// ============================================
// OTPInput — 6-digit OTP input with auto-focus
// ============================================

"use client";

import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const focusInput = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      inputRefs.current[clamped]?.focus();
    },
    [length]
  );

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (!/^\d$/.test(char)) return;

      const newDigits = [...digits];
      newDigits[index] = char;
      const newValue = newDigits.join("").slice(0, length);
      onChange(newValue);

      // Auto-advance to next input
      if (index < length - 1) {
        focusInput(index + 1);
      }
    },
    [digits, length, onChange, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        const newDigits = [...digits];

        if (digits[index]) {
          // Clear current digit
          newDigits[index] = "";
          onChange(newDigits.join(""));
        } else if (index > 0) {
          // Move back and clear previous
          newDigits[index - 1] = "";
          onChange(newDigits.join(""));
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [digits, onChange, focusInput]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, length);

      if (pasted.length > 0) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [length, onChange, focusInput]
  );

  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i] || ""}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1} of ${length}`}
            onChange={(e) => {
              const char = e.target.value.slice(-1);
              handleChange(i, char);
            }}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`h-12 w-10 rounded-lg border text-center text-lg font-semibold outline-none transition-all sm:h-14 sm:w-12 sm:text-xl ${
              error
                ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                : digits[i]
                  ? "border-brand-400 bg-brand-50 text-brand-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:bg-brand-900/20 dark:border-brand-600 dark:text-brand-400"
                  : "border-gray-300 bg-white text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

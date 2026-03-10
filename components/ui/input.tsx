import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-gray-700 lg:text-base dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors lg:py-3 lg:text-base dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 ${
            error
              ? "border-red-500 focus:ring-2 focus:ring-red-500"
              : "border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600"
          } ${props.disabled ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" : ""} ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-400 lg:text-sm dark:text-gray-500">{hint}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-500 lg:text-sm">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };

/**
 * Reusable form field component to reduce CSS duplication
 */
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'email';
  optional?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  error?: string;
  maxLength?: number;
}

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  optional = false,
  disabled = false,
  icon,
  error,
  maxLength,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label} {optional && <span className="text-slate-400">(optional)</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm md:text-base transition-colors ${
            icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
  rows?: number;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  disabled = false,
  rows = 4,
  error,
  maxLength,
  showCount = false,
}: TextAreaFieldProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label} {optional && <span className="text-slate-400">(optional)</span>}
        </label>
        {showCount && maxLength && (
          <span className="text-xs text-slate-500">
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm md:text-base transition-colors resize-none ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

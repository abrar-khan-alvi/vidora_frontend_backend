import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center justify-center mb-8 ${className}`}>
    <img src="/logo.png" alt="Vidora Logo" className="h-20 w-auto object-contain" />
  </div>
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = ({ label, type = 'text', className = '', ...props }: InputProps) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const typeToUse = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="mb-5 text-left">
      {label && <label className="block text-[13px] text-[#C4C4C8] mb-2">{label}</label>}
      <div className="relative flex items-center">
        <input
          type={typeToUse}
          className={`w-full bg-transparent border border-[#3A3A40] rounded-[10px] px-4 py-3.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF] focus:ring-1 focus:ring-[#9758FF] transition-all ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 text-[#7A7A80] hover:text-[#C4C4C8] transition-colors"
          >
            {show ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

type OTPInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
};

export const OTPInput = ({ value, onChange, length = 5 }: OTPInputProps) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (raw: string, index: number) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (raw && !digit) return; // ignore non-numeric input

    const next = value.split('');
    next[index] = digit;
    onChange(next.join('').slice(0, length));

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center mb-10 mt-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(e.target.value, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="w-12 h-14 bg-transparent border border-[#3A3A40] rounded-[10px] text-center text-[18px] text-white focus:outline-none focus:border-[#9758FF] transition-colors"
        />
      ))}
    </div>
  );
};

export const FormError = ({ message }: { message?: string }) =>
  message ? (
    <div className="mb-4 -mt-1 text-left text-[13px] text-[#F87171] bg-[#F87171]/10 border border-[#F87171]/20 rounded-[10px] px-3.5 py-2.5">
      {message}
    </div>
  ) : null;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export const Button = ({ children, className = '', loading = false, disabled, ...props }: ButtonProps) => (
  <button
    disabled={disabled || loading}
    className={`w-full bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-[10px] py-3.5 text-[15px] font-medium transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 ${className}`}
    {...props}
  >
    {loading && (
      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    )}
    {children}
  </button>
);

export const Checkbox = ({ label, defaultChecked = false }: { label: string, defaultChecked?: boolean }) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <div className="relative w-4 h-4 rounded-[4.5px] border border-[#3A3A40] bg-transparent group-hover:border-[#9758FF] transition-colors flex items-center justify-center">
      <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} />
      <div className="absolute inset-0 bg-[#9758FF] rounded-[4.5px] opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 4.5L3.5 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
    <span className="text-[13px] text-[#A1A1A5] group-hover:text-[#D0D0D5] transition-colors peer-checked:text-[#C4C4C8]">
      {label}
    </span>
  </label>
);

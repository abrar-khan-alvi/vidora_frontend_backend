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

export const OTPInput = () => {
  const [otp, setOtp] = useState(['', '', '', '', '']);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center mb-10 mt-2">
      {otp.map((val, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(e.target.value, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className="w-12 h-14 bg-transparent border border-[#3A3A40] rounded-[10px] text-center text-[18px] text-white focus:outline-none focus:border-[#9758FF] transition-colors"
        />
      ))}
    </div>
  );
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ children, className = '', ...props }: ButtonProps) => (
  <button
    className={`w-full bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-[10px] py-3.5 text-[15px] font-medium transition-all active:scale-[0.98] ${className}`}
    {...props}
  >
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

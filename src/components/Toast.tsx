import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: string) => toast(message, 'error'), [toast]);
  const info = useCallback((message: string) => toast(message, 'info'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? AlertCircle : Info;
            const borderColors = {
              success: 'border-[#10B981]/25 bg-[#0F1715]/95 shadow-[0_8px_30px_rgba(16,185,129,0.12)]',
              error: 'border-[#EF4444]/25 bg-[#171010]/95 shadow-[0_8px_30px_rgba(239,68,68,0.12)]',
              info: 'border-[#9758FF]/25 bg-[#110F17]/95 shadow-[0_8px_30px_rgba(151,88,255,0.12)]',
            };
            const textColors = {
              success: 'text-[#10B981]',
              error: 'text-[#EF4444]',
              info: 'text-[#C9A8FF]',
            };

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${borderColors[t.type]}`}
              >
                <Icon size={18} className={`${textColors[t.type]} shrink-0 mt-0.5`} />
                <p className="text-[13.5px] font-medium text-[#EAEAEA] leading-relaxed flex-1">{t.message}</p>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-[#7A7A80] hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

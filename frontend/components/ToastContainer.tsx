import React from 'react';
import { CheckCircle, ShieldAlert, Info } from 'lucide-react';
import { Toast } from '../../shared/types';

interface ToastContainerProps {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-xl max-w-sm animate-fade-in gap-3 text-xs font-semibold text-slate-800 dark:text-slate-100"
        >
          {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
          {t.type === 'error' && <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-indigo-500 shrink-0" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import { useToastStore } from '../store/toastStore.js';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 space-y-3 w-80 max-w-[90vw]">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';
        
        let bgColor = 'bg-emerald-950 border-emerald-800 text-emerald-300';
        let Icon = CheckCircle;

        if (isError) {
          bgColor = 'bg-red-950 border-red-800 text-red-300';
          Icon = AlertTriangle;
        } else if (isInfo) {
          bgColor = 'bg-blue-950 border-blue-800 text-blue-300';
          Icon = Info;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-x-0 ${bgColor}`}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};


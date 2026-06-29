import React, { useEffect, useRef } from 'react';
import { ShieldAlert, X } from 'lucide-react';

export const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  isDanger = false 
}) => {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on mount for safety
    cancelBtnRef.current?.focus();

    // Listen for Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md mx-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`h-5 w-5 ${isDanger ? 'text-red-400' : 'text-brand-400'}`} />
            <h3 id="confirm-modal-title" className="text-sm font-bold text-slate-100">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-350 hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-5">
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 px-5 py-4 bg-slate-950/40 border-t border-slate-850">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20' 
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20'
            }`}
          >
            {confirmText}
          </button>
          
          <button
            type="button"
            ref={cancelBtnRef}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

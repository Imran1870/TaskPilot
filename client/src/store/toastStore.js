import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));
export const showSuccessToast = (msg) => useToastStore.getState().addToast(msg, 'success');
export const showErrorToast = (msg) => useToastStore.getState().addToast(msg, 'error');
export const showInfoToast = (msg) => useToastStore.getState().addToast(msg, 'info');

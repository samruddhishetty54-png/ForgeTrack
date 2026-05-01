import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'success' }) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="w-[360px] p-4 bg-surface-raised border border-border-default rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] flex gap-3 pointer-events-auto">
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={1.75} />
              ) : (
                <XCircle className="w-5 h-5 text-danger" strokeWidth={1.75} />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-body font-semibold text-fg-primary">{toast.title}</h4>
              {toast.message && <p className="text-body-sm text-fg-secondary mt-1">{toast.message}</p>}
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-fg-tertiary hover:text-fg-primary transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

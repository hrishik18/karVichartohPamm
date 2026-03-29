import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'error', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // keep max 5
    timers.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const toast = useCallback({
    error: (msg, dur) => addToast(msg, 'error', dur),
    success: (msg, dur) => addToast(msg, 'success', dur || 3000),
    info: (msg, dur) => addToast(msg, 'info', dur),
  }, [addToast]);

  // Make toast callable as toast.error() etc, but also as a setError drop-in
  const value = Object.assign(
    (msg) => addToast(msg, 'error'),
    toast,
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TYPE_STYLES = {
  error: 'bg-red-500/90 text-white',
  success: 'bg-accent/90 text-white',
  info: 'bg-blue-500/90 text-white',
};

const TYPE_ICONS = {
  error: '✕',
  success: '✓',
  info: 'ℹ',
};

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-[90vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/30 backdrop-blur-sm animate-toast-in ${TYPE_STYLES[t.type]}`}
        >
          <span className="text-sm font-bold shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/20">
            {TYPE_ICONS[t.type]}
          </span>
          <span className="text-sm flex-1 min-w-0">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-white/60 hover:text-white text-lg leading-none transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}

      <style>{`
        @keyframes toast-in {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-toast-in {
          animation: toast-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

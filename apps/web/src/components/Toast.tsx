import { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type AddToast = (message: string, type?: Toast['type']) => void;

const ToastContext = createContext<AddToast>(() => {});

export function useToast(): AddToast {
  return useContext(ToastContext);
}

const ACCENT: Record<Toast['type'], string> = {
  success: 'var(--color-success)',
  error:   'var(--color-error)',
  info:    'var(--color-fg-muted)',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'var(--color-sidebar-bg)',
        border: '1px solid var(--color-sidebar-border)',
        borderLeft: `3px solid ${ACCENT[toast.type]}`,
        borderRadius: 'var(--radius-sm)',
        padding: '0.6rem 0.75rem',
        color: '#fff',
        fontSize: 'var(--text-sm)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        minWidth: 220,
        maxWidth: 360,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{ background: 'none', border: 'none', color: 'var(--color-sidebar-fg-muted)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback<AddToast>((message, type = 'success') => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 1000,
          pointerEvents: toasts.length ? 'auto' : 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

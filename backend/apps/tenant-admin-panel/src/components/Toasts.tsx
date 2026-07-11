import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icons';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

type PushToast = (kind: ToastKind, text: string) => void;

const ToastContext = createContext<PushToast>(() => undefined);

export function useToast(): PushToast {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback<PushToast>((kind, text) => {
    const id = nextId.current++;
    setToasts((cur) => [...cur, { id, kind, text }]);
    window.setTimeout(
      () => {
        setToasts((cur) => cur.filter((t) => t.id !== id));
      },
      kind === 'error' ? 4200 : 2400,
    );
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} data-testid="toast">
            <span className="toast-tile">
              <Icon
                name={t.kind === 'error' ? 'alert' : t.kind === 'info' ? 'info' : 'check'}
                strokeWidth={3}
              />
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastData {
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
}

const ToastContext = createContext<(toast: ToastData) => void>(() => {});
const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export const useToast = () => useContext(ToastContext);
export const useConfirm = () => useContext(ConfirmContext);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastData & { id: number }) | null>(null);
  const showToast = useCallback((t: ToastData) => setToast({ ...t, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.action ? 5000 : 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (confirmState && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [confirmState]);

  // Called on button press and on close (Esc or the Android back gesture).
  const settle = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    if (dialogRef.current?.open) dialogRef.current.close();
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={showToast}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <div className="toast-region" role="status" aria-live="polite">
          {toast && (
            <div key={toast.id} className="toast">
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </div>
        <dialog ref={dialogRef} className="dialog" onClose={() => settle(false)}>
          {confirmState && (
            <>
              <h2 className="dialog__title">{confirmState.title}</h2>
              {confirmState.message && <p className="dialog__text">{confirmState.message}</p>}
              <div className="dialog__actions">
                <button type="button" className="btn btn--ghost" onClick={() => settle(false)}>
                  Отмена
                </button>
                <button
                  type="button"
                  className={confirmState.danger ? 'btn btn--danger-solid' : 'btn btn--primary'}
                  onClick={() => settle(true)}
                >
                  {confirmState.confirmLabel}
                </button>
              </div>
            </>
          )}
        </dialog>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

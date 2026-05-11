import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type FeedbackTone = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: FeedbackTone;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: FeedbackTone;
};

type InputOptions = ConfirmOptions & {
  initialValue?: string;
  inputLabel?: string;
  placeholder?: string;
};

type ConfirmState = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

type InputState = InputOptions & {
  value: string;
  resolve: (value: string | null) => void;
};

type AdminFeedbackContextValue = {
  notify: (title: string, description?: string, tone?: FeedbackTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  requestInput: (options: InputOptions) => Promise<string | null>;
};

const AdminFeedbackContext = createContext<AdminFeedbackContextValue | null>(null);

function toneClasses(tone: FeedbackTone) {
  if (tone === 'error') return 'border-red-200 text-red-700 shadow-red-100/60 dark:border-red-500/20 dark:text-red-300';
  if (tone === 'success') return 'border-emerald-200 text-emerald-700 shadow-emerald-100/60 dark:border-emerald-500/20 dark:text-emerald-300';
  if (tone === 'warning') return 'border-amber-200 text-amber-700 shadow-amber-100/60 dark:border-amber-500/20 dark:text-amber-300';
  return 'border-blue-200 text-blue-700 shadow-blue-100/60 dark:border-blue-500/20 dark:text-blue-300';
}

function ToneIcon({ tone }: { tone: FeedbackTone }) {
  if (tone === 'success') return <CheckCircle2 size={18} />;
  if (tone === 'error' || tone === 'warning') return <AlertTriangle size={18} />;
  return <Info size={18} />;
}

export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [inputState, setInputState] = useState<InputState | null>(null);
  const toastTimersRef = useRef<number[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, description?: string, tone: FeedbackTone = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts(prev => [...prev, { id, title, description, tone }]);
      const timerId = window.setTimeout(() => dismissToast(id), tone === 'error' ? 5600 : 3800);
      toastTimersRef.current.push(timerId);
    },
    [dismissToast],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const requestInput = useCallback((options: InputOptions) => {
    return new Promise<string | null>(resolve => {
      setInputState({ ...options, value: options.initialValue ?? '', resolve });
    });
  }, []);

  const contextValue = useMemo(
    () => ({ notify, confirm, requestInput }),
    [confirm, notify, requestInput],
  );

  const closeConfirm = (confirmed: boolean) => {
    const current = confirmState;
    setConfirmState(null);
    current?.resolve(confirmed);
  };

  const closeInput = (value: string | null) => {
    const current = inputState;
    setInputState(null);
    current?.resolve(value);
  };

  return (
    <AdminFeedbackContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-lg backdrop-blur dark:bg-neutral-950 ${toneClasses(toast.tone)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <ToneIcon tone={toast.tone} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{toast.title}</div>
                {toast.description ? <div className="mt-1 text-xs leading-5 opacity-90">{toast.description}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
                aria-label="关闭提示"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-950">
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${toneClasses(confirmState.tone ?? 'warning')}`}>
              <ToneIcon tone={confirmState.tone ?? 'warning'} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{confirmState.title}</h3>
            {confirmState.description ? (
              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{confirmState.description}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
              >
                {confirmState.cancelLabel ?? '取消'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
                  confirmState.tone === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                }`}
              >
                {confirmState.confirmLabel ?? '确认'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {inputState ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <form
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-950"
            onSubmit={event => {
              event.preventDefault();
              closeInput(inputState.value);
            }}
          >
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{inputState.title}</h3>
            {inputState.description ? (
              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{inputState.description}</p>
            ) : null}
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {inputState.inputLabel ?? '输入内容'}
            </label>
            <input
              autoFocus
              value={inputState.value}
              placeholder={inputState.placeholder}
              onChange={event => setInputState(current => (current ? { ...current, value: event.target.value } : current))}
              className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-orange-400 focus:bg-white dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => closeInput(null)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
              >
                {inputState.cancelLabel ?? '取消'}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                {inputState.confirmLabel ?? '确认'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminFeedbackContext.Provider>
  );
}

export function useAdminFeedback() {
  const context = useContext(AdminFeedbackContext);
  if (!context) {
    throw new Error('useAdminFeedback must be used inside AdminFeedbackProvider');
  }
  return context;
}

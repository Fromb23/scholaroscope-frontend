'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { ToastViewport } from './ToastViewport';
import type { ToastContextValue, ToastInput, ToastMessage, ToastSeverity } from './toastTypes';

type ToastAction =
  | { type: 'enqueue'; toast: ToastMessage }
  | { type: 'dismiss'; id: string }
  | { type: 'clear' };

const DEFAULT_DURATION_BY_SEVERITY: Record<ToastSeverity, number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

let nextToastId = 0;

function createToastId(): string {
  nextToastId += 1;
  return `toast-${Date.now()}-${nextToastId}`;
}

export function normalizeToast(input: ToastInput): ToastMessage {
  const severity = input.severity ?? 'info';
  return {
    id: input.id ?? createToastId(),
    message: input.message,
    title: input.title,
    severity,
    autoDismissMs: input.autoDismissMs ?? DEFAULT_DURATION_BY_SEVERITY[severity],
    action: input.action,
  };
}

export function toastReducer(state: ToastMessage[], action: ToastAction): ToastMessage[] {
  switch (action.type) {
    case 'enqueue':
      return [...state.filter((toast) => toast.id !== action.toast.id), action.toast].slice(-4);
    case 'dismiss':
      return state.filter((toast) => toast.id !== action.id);
    case 'clear':
      return [];
    default:
      return state;
  }
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'dismiss', id });
  }, []);

  const showToast = useCallback((toastInput: ToastInput) => {
    const toast = normalizeToast(toastInput);
    dispatch({ type: 'enqueue', toast });
    return toast.id;
  }, []);

  const clearToasts = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  useEffect(() => {
    const timers = toasts
      .map((toast) => {
        const delay = toast.autoDismissMs;
        if (typeof delay !== 'number' || delay <= 0) {
          return null;
        }
        return globalThis.setTimeout(() => dismissToast(toast.id), delay);
      })
      .filter((timer): timer is NonNullable<typeof timer> => timer !== null);

    return () => timers.forEach((timer) => globalThis.clearTimeout(timer));
  }, [dismissToast, toasts]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearToasts,
    }),
    [clearToasts, dismissToast, showToast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

import type { ReactNode } from 'react';

export type ToastSeverity = 'info' | 'warning' | 'error' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

export interface ToastMessage {
  id: string;
  message: string;
  title?: string;
  severity: ToastSeverity;
  autoDismissMs: number | false;
  action?: ToastAction;
}

export type ToastInput = {
  id?: string;
  message: string;
  title?: string;
  severity?: ToastSeverity;
  autoDismissMs?: number | false;
  action?: ToastAction;
};

export interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

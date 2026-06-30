export type ToastSeverity = 'info' | 'warning' | 'error' | 'success';

export interface ToastMessage {
  id: string;
  message: string;
  title?: string;
  severity: ToastSeverity;
  autoDismissMs: number | false;
}

export type ToastInput = {
  id?: string;
  message: string;
  title?: string;
  severity?: ToastSeverity;
  autoDismissMs?: number | false;
};

export interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

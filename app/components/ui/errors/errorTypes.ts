export interface ErrorUiModel {
  kind: string;
  title: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
  severity: 'info' | 'warning' | 'error';
  actionLabel?: string;
  supportCode?: string;
  rawStatus?: number;
  serverCode?: string;
}

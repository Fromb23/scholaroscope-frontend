export interface ErrorUiModel {
  kind: string;
  title: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
  severity: 'info' | 'warning' | 'error';
  channel?: 'toast' | 'inline' | 'banner' | 'page';
  actionLabel?: string;
  supportCode?: string;
  rawStatus?: number;
  serverCode?: string;
}

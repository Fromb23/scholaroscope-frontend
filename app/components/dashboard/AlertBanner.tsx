import { AlertCircle, XCircle, Info, CheckCircle } from 'lucide-react';

interface Alert {
  id: number;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

interface AlertBannerProps {
  alerts: Alert[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return {
          container: 'theme-danger-surface',
          icon: <XCircle className="h-5 w-5 text-[color:var(--color-danger)]" />,
          text: 'theme-text',
          button: 'text-[color:var(--color-danger)] hover:opacity-80',
        };
      case 'warning':
        return {
          container: 'theme-warning-surface',
          icon: <AlertCircle className="h-5 w-5 text-[color:var(--color-warning)]" />,
          text: 'theme-text',
          button: 'text-[color:var(--color-warning)] hover:opacity-80',
        };
      case 'info':
        return {
          container: 'theme-info-surface',
          icon: <Info className="h-5 w-5 text-[color:var(--color-primary)]" />,
          text: 'theme-text',
          button: 'text-[color:var(--color-primary)] hover:opacity-80',
        };
      case 'success':
        return {
          container: 'theme-success-surface',
          icon: <CheckCircle className="h-5 w-5 text-[color:var(--color-success)]" />,
          text: 'theme-text',
          button: 'text-[color:var(--color-success)] hover:opacity-80',
        };
    }
  };

  return (
    <div className="theme-card rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <AlertCircle className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold theme-text">Notifications</h2>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);

          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${styles.container}`}
            >
              <div className="flex items-center space-x-2 flex-1">
                {styles.icon}
                <span className={`text-sm ${styles.text}`}>{alert.message}</span>
              </div>

              <div className="flex items-center space-x-2">
                {alert.action && alert.onAction && (
                  <button
                    onClick={alert.onAction}
                    className={`text-sm font-medium ${styles.button}`}
                  >
                    {alert.action} →
                  </button>
                )}

                {alert.onDismiss && (
                  <button
                    onClick={alert.onDismiss}
                    className="theme-focus-ring rounded-md p-1 theme-muted transition-colors hover:text-[color:var(--color-text)]"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

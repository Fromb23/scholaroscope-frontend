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
                    container: 'bg-red-50 border-red-200',
                    icon: <XCircle className="w-5 h-5 text-red-500" />,
                    text: 'text-red-700',
                    button: 'text-red-600 hover:text-red-700',
                };
            case 'warning':
                return {
                    container: 'bg-yellow-50 border-yellow-200',
                    icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
                    text: 'text-yellow-700',
                    button: 'text-yellow-600 hover:text-yellow-700',
                };
            case 'info':
                return {
                    container: 'bg-blue-50 border-blue-200',
                    icon: <Info className="w-5 h-5 text-blue-500" />,
                    text: 'text-blue-700',
                    button: 'text-blue-600 hover:text-blue-700',
                };
            case 'success':
                return {
                    container: 'bg-green-50 border-green-200',
                    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
                    text: 'text-green-700',
                    button: 'text-green-600 hover:text-green-700',
                };
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-2">
                {alerts.map(alert => {
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
                                        className="text-gray-400 hover:text-gray-600"
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
import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
    trend?: {
        value: number;
        positive: boolean;
    };
    alert?: boolean;
    onClick?: () => void;
}

export function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    trend,
    alert,
    onClick
}: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        purple: 'bg-purple-100 text-purple-600',
        red: 'bg-red-100 text-red-600',
    };

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer' : ''
                }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {alert && (
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </div>

            <div>
                <p className="text-sm text-gray-600 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

                <div className="flex items-center justify-between">
                    {subtitle && (
                        <p className="text-xs text-gray-500">{subtitle}</p>
                    )}

                    {trend && (
                        <span className={`flex items-center text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {trend.positive ? (
                                <ArrowUp className="w-3 h-3 mr-1" />
                            ) : trend.value === 0 ? (
                                <Minus className="w-3 h-3 mr-1" />
                            ) : (
                                <ArrowDown className="w-3 h-3 mr-1" />
                            )}
                            {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
import { LucideIcon } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'orange';
    subtitle?: string;
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue',
    subtitle
}: StatsCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <Card>
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
                        {subtitle && (
                            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                        )}
                        {trend && (
                            <p className={`mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </p>
                        )}
                    </div>
                    <div className={`rounded-full p-3 ${colorClasses[color]}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
            </div>
        </Card>
    );
}
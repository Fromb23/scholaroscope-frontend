import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { themeClasses } from '@/app/core/theme/themeClasses';

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
  onClick,
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg',
    green: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg',
    yellow: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg',
    red: 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg',
  };

  return (
    <div
      onClick={onClick}
      className={`${themeClasses.dashboardCard} p-6 transition-all hover:shadow-lg ${
        onClick ? 'cursor-pointer' : ''
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
        <p className="mb-1 text-sm theme-muted">{title}</p>
        <p className="mb-2 text-3xl font-bold theme-text">{value}</p>

        <div className="flex items-center justify-between">
          {subtitle && <p className="text-xs theme-subtle">{subtitle}</p>}

          {trend && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend.positive ? 'text-green-600' : 'text-red-600'
              }`}
            >
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

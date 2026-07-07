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
  mobile?: 'show' | 'compact' | 'hide';
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  subtitle,
  mobile = 'compact',
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg',
    green: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg',
    yellow: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg',
    red: 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg',
    indigo: 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg',
    orange: 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg',
  };

  const renderFullCard = () => (
    <Card className="rounded-2xl shadow-[var(--shadow-soft)]">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium theme-muted">{title}</p>
            <p className="mt-2 text-3xl font-semibold theme-text">{value}</p>
            {subtitle && <p className="mt-1 text-sm theme-subtle">{subtitle}</p>}
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

  return (
    <>
      {mobile === 'compact' ? (
        <div className="md:hidden rounded-lg border theme-border theme-surface px-3 py-2">
          <p className="break-words text-xl font-semibold leading-tight theme-text">{value}</p>
          <p className="mt-1 break-words text-xs font-medium theme-muted">{title}</p>
        </div>
      ) : null}
      {mobile === 'show' ? (
        <div className="md:hidden">
          {renderFullCard()}
        </div>
      ) : null}
      <div className="hidden md:block">
        {renderFullCard()}
      </div>
    </>
  );
}

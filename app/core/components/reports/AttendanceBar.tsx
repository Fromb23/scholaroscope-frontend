// Reusable attendance progress bar + badge
'use client';
import { Badge } from '@/app/components/ui/Badge';

interface Props {
    percentage: number;
    showBar?: boolean;
}

function variant(pct: number): 'green' | 'yellow' | 'orange' | 'red' {
    if (pct >= 90) return 'green';
    if (pct >= 75) return 'yellow';
    if (pct >= 60) return 'orange';
    return 'red';
}

export function AttendanceBar({ percentage, showBar = true }: Props) {
    const color = variant(percentage);
    const barColor = {
        green: 'bg-green-500', yellow: 'bg-yellow-500',
        orange: 'bg-orange-500', red: 'bg-red-500',
    }[color];

    return (
        <div className="flex items-center gap-2">
            {showBar && (
                <div className="w-20 bg-gray-200 rounded-full h-1.5 shrink-0">
                    <div
                        className={`h-1.5 rounded-full ${barColor}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            )}
            <Badge variant={color === 'green' ? 'green' : color === 'yellow' ? 'yellow' : color === 'orange' ? 'orange' : 'red'}>
                {percentage.toFixed(0)}%
            </Badge>
        </div>
    );
}
'use client';
import { Badge } from '@/app/components/ui/Badge';

interface Props {
    grade: string;
    label?: string;
    status?: string;
}

function gradeVariant(grade: string): 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'default' {
    if (grade === 'A' || grade === 'A-' || grade.startsWith('EE')) return 'green';
    if (grade === 'B' || grade === 'B+' || grade.startsWith('ME')) return 'blue';
    if (grade === 'C' || grade === 'C+' || grade.startsWith('AE')) return 'yellow';
    if (grade === 'D' || grade.startsWith('BE')) return 'orange';
    if (grade === 'E') return 'red';
    return 'default';
}

export function GradeBadge({ grade, label, status }: Props) {
    if (!grade) return <span className="text-gray-400 text-sm">—</span>;
    return (
        <div className="flex flex-col items-start gap-0.5">
            <Badge variant={gradeVariant(grade)}>
                {grade}{label ? ` · ${label}` : ''}
            </Badge>
            {status && status !== 'FINAL' && (
                <span className="text-xs text-amber-600 font-medium">{status}</span>
            )}
        </div>
    );
}
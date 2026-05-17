import type { ComponentProps } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import type { LessonPlanStatus } from '@/app/core/types/lessonPlans';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

const STATUS_META: Record<
    LessonPlanStatus,
    { label: string; variant: BadgeVariant }
> = {
    DRAFT: { label: 'Draft', variant: 'default' },
    GENERATED: { label: 'Generated', variant: 'blue' },
    REVIEWED: { label: 'Reviewed', variant: 'purple' },
    USED: { label: 'Used', variant: 'green' },
    ARCHIVED: { label: 'Archived', variant: 'orange' },
};

interface LessonPlanStatusBadgeProps {
    status: LessonPlanStatus;
    size?: ComponentProps<typeof Badge>['size'];
    className?: string;
}

export function LessonPlanStatusBadge({
    status,
    size = 'md',
    className = '',
}: LessonPlanStatusBadgeProps) {
    const meta = STATUS_META[status];

    return (
        <Badge variant={meta.variant} size={size} className={className}>
            {meta.label}
        </Badge>
    );
}

'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight, LineChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCambridgeCohortSubjects } from '@/app/plugins/cambridge/hooks';

interface CambridgeActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href?: string;
    disabledReason?: string;
    footerLabel?: string;
}

function CambridgeActionCard({
    title,
    description,
    icon: Icon,
    href,
    disabledReason,
    footerLabel,
}: CambridgeActionCardProps) {
    const content = (
        <>
            <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-600">{description}</p>
                    {disabledReason ? (
                        <p className="text-sm font-medium text-amber-700">{disabledReason}</p>
                    ) : null}
                </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
                <span className={`text-sm font-semibold ${href ? 'text-blue-600' : 'text-gray-400'}`}>
                    {footerLabel ?? (href ? 'Open' : 'Unavailable')}
                </span>
                {href ? <ChevronRight className="h-5 w-5 text-blue-600" /> : null}
            </div>
        </>
    );

    if (!href) {
        return (
            <div
                aria-disabled="true"
                className="flex min-h-[208px] flex-col justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 opacity-80"
            >
                {content}
            </div>
        );
    }

    return (
        <Link
            href={href}
            className="flex min-h-[208px] flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
            {content}
        </Link>
    );
}

export function CambridgeCohortDetailCards({ cohortId }: { cohortId: number }) {
    const { data: assignments = [], isLoading } = useCambridgeCohortSubjects({
        cohort: cohortId,
        active: true,
    });

    const assignmentCount = assignments.length;
    const hasAssignments = assignmentCount > 0;
    const disabledReason = isLoading
        ? 'Checking Cambridge subject assignments for this cohort...'
        : 'No Cambridge subjects assigned to this cohort yet.';

    return (
        <>
            <CambridgeActionCard
                title="Cambridge Subjects"
                description="Open Cambridge subject offerings and cohort delivery for this cohort."
                icon={BookOpen}
                href={hasAssignments ? '/cambridge/subjects' : undefined}
                disabledReason={!hasAssignments ? disabledReason : undefined}
                footerLabel={hasAssignments ? `${assignmentCount} assigned` : undefined}
            />
            <CambridgeActionCard
                title="Cambridge Progress"
                description="Review Cambridge subject progress available to this cohort."
                icon={LineChart}
                href={hasAssignments ? '/cambridge/progress' : undefined}
                disabledReason={!hasAssignments ? disabledReason : undefined}
                footerLabel={hasAssignments ? 'View progress' : undefined}
            />
        </>
    );
}

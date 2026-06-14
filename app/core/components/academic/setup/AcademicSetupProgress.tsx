'use client';

import { CheckCircle2, Lock, PlayCircle } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import type { AcademicSetupStatus } from '@/app/core/types/academic';

function stepVariant(status: AcademicSetupStatus['steps'][number]['status']) {
    switch (status) {
        case 'complete':
            return 'green';
        case 'current':
            return 'blue';
        default:
            return 'default';
    }
}

function StepIcon({ status }: { status: AcademicSetupStatus['steps'][number]['status'] }) {
    if (status === 'complete') {
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === 'current') {
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
    }
    return <Lock className="h-4 w-4 theme-subtle" />;
}

export function AcademicSetupProgress({
    status,
}: {
    status: AcademicSetupStatus;
}) {
    return (
        <div className="space-y-3">
            {status.steps.map((step, index) => (
                <div
                    key={step.key}
                    className="flex items-start gap-3 rounded-xl border px-4 py-3 theme-border theme-surface-muted"
                >
                    <div className="mt-0.5 shrink-0">
                        <StepIcon status={step.status} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold theme-text">
                                {index + 1}. {step.label}
                            </p>
                            <Badge variant={stepVariant(step.status)} size="sm">
                                {step.status === 'current'
                                    ? 'Current'
                                    : step.status === 'complete'
                                        ? 'Complete'
                                        : 'Locked'}
                            </Badge>
                        </div>
                        <p className="text-sm theme-muted">{step.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Lock, PlayCircle, Puzzle } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import {
    getAcademicSetupLockedReason,
    getAcademicSetupStepHref,
    getAcademicSetupStepStatusLabel,
} from '@/app/core/lib/academicSetup';
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {status.steps.map((step, index) => (
                <div
                    key={step.key}
                    className={`flex min-h-56 flex-col rounded-2xl border p-5 theme-border ${
                        step.status === 'current'
                            ? 'border-blue-300 bg-blue-50/70'
                            : step.status === 'complete'
                                ? 'bg-green-50/60'
                                : 'theme-surface-muted'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                            <StepIcon status={step.status} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                    Step {index + 1}
                                </p>
                                <Badge variant={stepVariant(step.status)} size="sm">
                                    {getAcademicSetupStepStatusLabel(step.status)}
                                </Badge>
                            </div>
                            <p className="text-sm font-semibold theme-text">{step.label}</p>
                            <p className="text-sm theme-muted">{step.description}</p>
                        </div>
                    </div>

                    {step.status === 'locked' ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {getAcademicSetupLockedReason(status, step)}
                        </div>
                    ) : null}

                    {step.key === 'CURRICULUM' ? (
                        <div className="mt-4 rounded-xl border border-blue-100 bg-white/70 px-3 py-2 text-xs text-blue-900">
                            Select a Scholaroscope-powered curriculum such as CBC or Cambridge. Scholaroscope will register it in this workspace and unlock subject offerings.
                        </div>
                    ) : null}

                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                        {step.status === 'locked' ? (
                            <Button type="button" variant="secondary" disabled>
                                Locked
                            </Button>
                        ) : (
                            <Link href={getAcademicSetupStepHref(step)}>
                                <Button type="button" variant={step.status === 'current' ? 'primary' : 'secondary'}>
                                    {step.status === 'complete'
                                        ? 'Review / adjust'
                                        : step.status === 'current'
                                            ? 'Continue'
                                            : 'Open'}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                        {step.key === 'CURRICULUM' ? (
                            <Link href="/admin/settings?tab=plugins&from=academic-setup">
                                <Button type="button" variant="ghost">
                                    <Puzzle className="h-4 w-4" />
                                    Open curriculum settings
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}

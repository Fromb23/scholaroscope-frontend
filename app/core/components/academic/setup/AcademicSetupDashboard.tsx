'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap, Lock } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AcademicSetupProgress } from '@/app/core/components/academic/setup/AcademicSetupProgress';
import {
    getAcademicSetupCurrentStepDisplayLabel,
    getAcademicSetupNextActionDisplayLabel,
    withAcademicSetupMode,
} from '@/app/core/lib/academicSetup';
import type { AcademicSetupStatus } from '@/app/core/types/academic';

export function AcademicSetupDashboard({
    status,
    title = 'Academic Engine Setup',
    intro = 'You can review and adjust completed decisions at any time before teaching starts.',
}: {
    status: AcademicSetupStatus;
    title?: string;
    intro?: string;
}) {
    const lockedAreas = status.locked_until_complete.map((area) => area.replace(/_/g, ' '));
    const nextActionHref = status.complete
        ? status.next_action.href
        : withAcademicSetupMode(status.next_action.href);

    return (
        <div className="space-y-6">
            <Card>
                <div className="space-y-6 p-6">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                            <h1 className="text-2xl font-semibold theme-text">{title}</h1>
                            <Badge variant={status.complete ? 'green' : 'blue'}>
                                {status.complete ? 'Complete' : 'Setup in progress'}
                            </Badge>
                        </div>
                        <p className="text-sm theme-muted">{intro}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="rounded-2xl border p-5 theme-border theme-surface-muted">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                    Set up your academic engine
                                </p>
                                <h2 className="mt-2 text-xl font-semibold theme-text">
                                    {getAcademicSetupCurrentStepDisplayLabel(status) ?? 'Academic setup is complete'}
                                </h2>
                                <p className="mt-2 text-sm theme-muted">
                                    {status.current_step_description ?? 'Operational features are unlocked.'}
                                </p>
                                <div className="mt-4">
                                    <Link href={nextActionHref}>
                                        <Button>
                                            {getAcademicSetupNextActionDisplayLabel(status)}
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {!status.complete && lockedAreas.length > 0 ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                                    <div className="flex items-start gap-3">
                                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div className="space-y-2">
                                            <p className="font-semibold">Operational areas stay locked until setup is complete.</p>
                                            <p>{lockedAreas.join(', ')}.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-semibold theme-text">Setup console</p>
                            <AcademicSetupProgress status={status} />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

'use client';

import { AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { AcademicSetupStatus } from '@/app/core/types/academic';

interface TeachingTodaySetupBlockedStateProps {
    setupStatus: AcademicSetupStatus | null;
}

export function TeachingTodaySetupBlockedState({ setupStatus }: TeachingTodaySetupBlockedStateProps) {
    const incompleteSteps = setupStatus?.steps.filter((step) => step.status !== 'complete') ?? [];
    const currentStep = setupStatus?.steps.find((step) => step.status === 'current') ?? null;

    return (
        <section className="theme-card rounded-lg border theme-border p-4 sm:p-5" aria-labelledby="teaching-today-setup-blocked">
            <div className="flex items-start gap-3">
                <div className="rounded-lg p-2 theme-warning-surface text-[color:var(--color-warning)]">
                    <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 id="teaching-today-setup-blocked" className="text-lg font-semibold theme-text">
                            Your school programme is not ready yet
                        </h2>
                        <Badge variant="warning">Limited diary</Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 theme-muted">
                        The admin still needs to complete term, class, subject, or scheme setup before daily teaching activities can be mapped. Teaching Today will become active after the school programme is ready.
                    </p>

                    {currentStep ? (
                        <div className="mt-4 rounded-lg border theme-border theme-surface-muted p-3">
                            <p className="text-xs font-medium uppercase theme-subtle">Current missing setup</p>
                            <p className="mt-1 text-sm font-semibold theme-text">{currentStep.label}</p>
                            <p className="mt-1 text-sm theme-muted">{currentStep.description}</p>
                        </div>
                    ) : null}

                    {incompleteSteps.length > 0 ? (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {incompleteSteps.map((step) => (
                                <div key={step.key} className="rounded-lg border theme-border bg-white/70 p-3">
                                    <div className="flex items-start gap-2">
                                        {step.status === 'current' ? (
                                            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
                                        ) : (
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 theme-subtle" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-medium theme-text">
                                                {step.label}
                                            </p>
                                            <p className="mt-1 text-xs theme-muted">
                                                {step.status === 'current' ? 'Next setup step' : 'Waiting for earlier setup'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

'use client';

import { CheckCircle2, Circle, OctagonAlert } from 'lucide-react';
import type { AssignmentLifecycleState } from '@/app/core/types/assignments';

const ASSIGNMENT_PROGRESS_STAGES = [
    'Prepared',
    'Issued',
    'Responses',
    'Review',
    'Evidence',
    'Stored',
] as const;

export type AssignmentProgressStageLabel = typeof ASSIGNMENT_PROGRESS_STAGES[number];

export function getAssignmentCurrentProgressStage(
    lifecycleState: AssignmentLifecycleState,
): AssignmentProgressStageLabel {
    if (lifecycleState.stage === 'PREPARING') {
        return 'Prepared';
    }

    if (lifecycleState.stage === 'STORED') {
        return 'Stored';
    }

    if (lifecycleState.stage === 'REVIEWING') {
        if (
            lifecycleState.next_action === 'STORE_RECORD'
            || lifecycleState.next_action === 'RECORD_EVIDENCE'
            || lifecycleState.summary.evidence_pending_count > 0
            || (lifecycleState.summary.evidence_blocked_count ?? 0) > 0
        ) {
            return 'Evidence';
        }

        return 'Review';
    }

    if (
        lifecycleState.summary.submissions_count > 0
        || lifecycleState.summary.pending_review_count > 0
        || lifecycleState.next_action === 'REVIEW_WORK'
    ) {
        return 'Responses';
    }

    return 'Issued';
}

interface AssignmentProgressTrackerProps {
    lifecycleState: AssignmentLifecycleState;
}

export function AssignmentProgressTracker({ lifecycleState }: AssignmentProgressTrackerProps) {
    const currentStage = getAssignmentCurrentProgressStage(lifecycleState);
    const currentIndex = ASSIGNMENT_PROGRESS_STAGES.indexOf(currentStage);
    const blocked = lifecycleState.blocking_items.length > 0;

    return (
        <div className="space-y-3 rounded-lg border theme-border theme-surface-muted px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Assignment progress</p>
                    <p className="mt-1 text-sm font-semibold theme-text">
                        Current stage: {currentStage}
                    </p>
                </div>
                <p className="text-xs theme-muted">
                    {lifecycleState.stage === 'STORED'
                        ? 'Stored for records'
                        : lifecycleState.next_action_description}
                </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-6" aria-label="Assignment progress stages">
                {ASSIGNMENT_PROGRESS_STAGES.map((stage, index) => {
                    const complete = index < currentIndex || lifecycleState.stage === 'STORED';
                    const current = index === currentIndex && lifecycleState.stage !== 'STORED';
                    const blockedCurrent = current && blocked;

                    return (
                        <div
                            key={stage}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                                complete
                                    ? 'theme-success-surface border-green-200'
                                    : blockedCurrent
                                        ? 'theme-warning-surface border-amber-200'
                                        : current
                                            ? 'theme-info-surface border-blue-200'
                                            : 'theme-surface-elevated theme-border'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {complete ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--color-success)]" />
                                ) : blockedCurrent ? (
                                    <OctagonAlert className="h-4 w-4 shrink-0 text-[color:var(--color-warning)]" />
                                ) : (
                                    <Circle className="h-4 w-4 shrink-0 theme-subtle" />
                                )}
                                <span className="font-medium theme-text">{stage}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

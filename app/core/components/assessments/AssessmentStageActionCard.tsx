'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    CheckCircle2,
    Circle,
    ClipboardCheck,
    Download,
    Edit,
    PlayCircle,
    SearchCheck,
    Trash2,
} from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type { AssessmentDetail } from '@/app/core/types/assessment';

const ASSESSMENT_STAGES = [
    'Prepared',
    'Active',
    'Scores',
    'Review',
    'Finalized',
    'Reflected',
] as const;

export type AssessmentStageLabel = typeof ASSESSMENT_STAGES[number];

export function getAssessmentCurrentStage(args: {
    isDraft: boolean;
    isActive: boolean;
    isFinalized: boolean;
    scoredCount: number;
    unscoredCount: number;
    canFinalize: boolean;
}): AssessmentStageLabel {
    if (args.isFinalized) {
        return 'Finalized';
    }

    if (args.isDraft) {
        return 'Prepared';
    }

    if (args.isActive) {
        if (args.scoredCount > 0 && args.unscoredCount === 0 && args.canFinalize) {
            return 'Review';
        }

        if (args.scoredCount > 0 || args.unscoredCount > 0) {
            return 'Scores';
        }

        return 'Active';
    }

    return 'Prepared';
}

interface AssessmentStageActionCardProps {
    assessment: AssessmentDetail;
    assessmentId: number;
    isDraft: boolean;
    isActive: boolean;
    isFinalized: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canActivate: boolean;
    canFinalize: boolean;
    canScore: boolean;
    canExportPdf: boolean;
    finalizing: boolean;
    deleting: boolean;
    downloadingPdf: boolean;
    saving: boolean;
    scoredCount: number;
    unscoredCount: number;
    pendingMakeupCount: number;
    onActivate: () => void;
    onFinalize: () => void;
    onDownloadPdf: () => void;
    onDelete: () => void;
    onRecordScores: () => void;
    onViewResults: () => void;
    onReviewMissingLearners: () => void;
}

function getSafeEditHref(assessmentId: number, returnTo: string | null): string {
    if (!returnTo) {
        return `/assessments/${assessmentId}/edit`;
    }

    return `/assessments/${assessmentId}/edit?${new URLSearchParams({
        returnTo,
    }).toString()}`;
}

export function AssessmentStageActionCard({
    assessment,
    assessmentId,
    isDraft,
    isActive,
    isFinalized,
    canUpdate,
    canDelete,
    canActivate,
    canFinalize,
    canScore,
    canExportPdf,
    finalizing,
    deleting,
    downloadingPdf,
    saving,
    scoredCount,
    unscoredCount,
    pendingMakeupCount,
    onActivate,
    onFinalize,
    onDownloadPdf,
    onDelete,
    onRecordScores,
    onViewResults,
    onReviewMissingLearners,
}: AssessmentStageActionCardProps) {
    const searchParams = useSearchParams();
    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return value?.startsWith('/') ? value : null;
    }, [searchParams]);
    const editHref = useMemo(
        () => getSafeEditHref(assessmentId, safeReturnTo),
        [assessmentId, safeReturnTo]
    );
    const currentStage = getAssessmentCurrentStage({
        isDraft,
        isActive,
        isFinalized,
        scoredCount,
        unscoredCount,
        canFinalize,
    });
    const currentIndex = ASSESSMENT_STAGES.indexOf(currentStage);

    const primaryAction = useMemo(() => {
        if (isFinalized) {
            return {
                label: 'View finalized results',
                onSelect: onViewResults,
                icon: SearchCheck,
            };
        }

        if (pendingMakeupCount > 0 && canScore) {
            return {
                label: 'Review missing learners',
                onSelect: onReviewMissingLearners,
                icon: SearchCheck,
            };
        }

        if (isActive && canScore && unscoredCount > 0) {
            return {
                label: 'Record scores',
                onSelect: onRecordScores,
                icon: ClipboardCheck,
            };
        }

        if (isActive && canFinalize) {
            return {
                label: 'Finalize assessment',
                onSelect: onFinalize,
                icon: CheckCircle2,
                disabled: finalizing,
                pendingLabel: 'Finalizing...',
            };
        }

        if (isDraft && canActivate) {
            return {
                label: 'Prepare assessment',
                onSelect: onActivate,
                icon: PlayCircle,
            };
        }

        if (!isFinalized && canScore) {
            return {
                label: 'Record scores',
                onSelect: onRecordScores,
                icon: ClipboardCheck,
            };
        }

        return {
            label: 'View results',
            onSelect: onViewResults,
            icon: SearchCheck,
        };
    }, [
        canActivate,
        canFinalize,
        canScore,
        finalizing,
        isActive,
        isDraft,
        isFinalized,
        onActivate,
        onFinalize,
        onRecordScores,
        onReviewMissingLearners,
        onViewResults,
        pendingMakeupCount,
        unscoredCount,
    ]);

    const PrimaryIcon = primaryAction.icon;
    const primaryLabel = primaryAction.disabled && primaryAction.pendingLabel
        ? primaryAction.pendingLabel
        : primaryAction.label;
    const secondaryActions: ActionMenuItem[] = [
        ...(canExportPdf
            ? [{
                label: downloadingPdf ? 'Downloading PDF...' : 'Download PDF',
                onSelect: onDownloadPdf,
                disabled: downloadingPdf,
                icon: <Download className="h-4 w-4" />,
            }]
            : []),
        ...(!isFinalized && canUpdate
            ? [{
                label: 'Edit assessment',
                href: editHref,
                icon: <Edit className="h-4 w-4" />,
            }]
            : []),
        ...(isDraft && canActivate && primaryAction.label !== 'Prepare assessment'
            ? [{
                label: 'Prepare assessment',
                onSelect: onActivate,
                icon: <PlayCircle className="h-4 w-4" />,
            }]
            : []),
        ...(isActive && canScore && primaryAction.label !== 'Record scores'
            ? [{
                label: 'Record scores',
                onSelect: onRecordScores,
                icon: <ClipboardCheck className="h-4 w-4" />,
            }]
            : []),
        ...(isActive && canFinalize && primaryAction.label !== 'Finalize assessment'
            ? [{
                label: finalizing ? 'Finalizing...' : 'Finalize assessment',
                onSelect: onFinalize,
                disabled: finalizing,
                icon: <CheckCircle2 className="h-4 w-4" />,
            }]
            : []),
        ...(canDelete
            ? [{
                label: deleting ? 'Deleting...' : 'Delete assessment',
                onSelect: onDelete,
                disabled: deleting,
                destructive: true,
                icon: <Trash2 className="h-4 w-4" />,
            }]
            : []),
    ];

    return (
        <Card className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Assessment progress</p>
                    <h2 className="mt-1 text-xl font-semibold theme-text">{currentStage}</h2>
                    <p className="mt-1 text-sm theme-muted">
                        {assessment.name} is at this stage. Choose the next safe action before using More.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                        type="button"
                        onClick={primaryAction.onSelect}
                        disabled={primaryAction.disabled || saving}
                    >
                        <PrimaryIcon className="h-4 w-4" />
                        {primaryLabel}
                    </Button>
                    <ActionMenu
                        items={secondaryActions}
                        buttonLabel="More"
                        ariaLabel="Open more assessment actions"
                        hideLabelOnMobile={false}
                    />
                </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-6" aria-label="Assessment progress stages">
                {ASSESSMENT_STAGES.map((stage, index) => {
                    const complete = index < currentIndex || (isFinalized && stage === 'Finalized');
                    const current = index === currentIndex;

                    return (
                        <div
                            key={stage}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                                complete
                                    ? 'theme-success-surface border-green-200'
                                    : current
                                        ? 'theme-info-surface border-blue-200'
                                        : 'theme-surface-elevated theme-border'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {complete ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--color-success)]" />
                                ) : (
                                    <Circle className="h-4 w-4 shrink-0 theme-subtle" />
                                )}
                                <span className="font-medium theme-text">{stage}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Scores recorded</p>
                    <p className="mt-1 font-semibold theme-text">{scoredCount}</p>
                </div>
                <div className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Still to review</p>
                    <p className="mt-1 font-semibold theme-text">{unscoredCount}</p>
                </div>
                <div className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Missing learners</p>
                    <p className="mt-1 font-semibold theme-text">{pendingMakeupCount}</p>
                </div>
            </div>
        </Card>
    );
}

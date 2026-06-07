'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, FolderOpen, MessageSquareText, Palette, Users } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import { subscribeToSessionDataChanged } from '@/app/core/lib/sessionEvents';
import type {
    FineArtsCourseworkTask,
    FineArtsPracticalContract,
    FineArtsPracticalEvidencePayload,
} from '@/app/core/types/session';
import { FineArtsLearnerWorksheetPanel } from '@/app/plugins/cbc/components/fineArts/FineArtsLearnerWorksheetPanel';
import {
    useFineArtsCourseworkTasks,
    useRecordFineArtsPracticalEvidence,
    useResolveFineArtsPractical,
    useSessionFineArtsLearnerEvidence,
    useSessionFineArtsPractical,
} from '@/app/plugins/cbc/hooks/useFineArtsPracticals';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
import {
    getFineArtsWorksheetStorageKey,
    hasResolvedFineArtsPracticalContract,
} from '@/app/plugins/cbc/lib/fineArtsPracticals';

interface FineArtsPracticalRequirementsCardProps {
    sessionId: number;
    editable?: boolean;
    guidedMode?: boolean;
    title?: string;
    onStateChange?: () => Promise<void> | void;
    footer?: ReactNode;
}

function formatExhibitionLabel(exhibitionType?: 'MINI_EXHIBITION' | 'END_YEAR_EXHIBITION' | null) {
    return exhibitionType === 'END_YEAR_EXHIBITION'
        ? 'End Year Exhibition'
        : 'Mini Exhibition';
}

function formatEvidenceLabel(value: string) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function summaryText(contract: FineArtsPracticalContract | null | undefined) {
    if (!contract) {
        return 'Resolve the official coursework task, then record the Fine Arts session proof and learner worksheet evidence before closing the lesson.';
    }

    if (!contract.resolved) {
        return contract.message ?? 'Resolve the official coursework task before recording Fine Arts evidence.';
    }

    if (!contract.session_proof_complete) {
        return contract.session_proof_message ?? contract.message ?? 'Complete the Fine Arts session proof checklist.';
    }

    if (!contract.learner_evidence_ready) {
        return 'Session proof is complete. Record learner worksheet evidence before closing this Fine Arts practical.';
    }

    return 'Fine Arts session proof and learner worksheet evidence are complete.';
}

export function FineArtsPracticalRequirementsCard({
    sessionId,
    editable = false,
    guidedMode = false,
    title = 'Fine Arts Practical Requirements',
    onStateChange,
    footer,
}: FineArtsPracticalRequirementsCardProps) {
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState<'proof' | 'learner'>('proof');
    const [fullReviewOpen, setFullReviewOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [teacherFeedbackDraft, setTeacherFeedbackDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const practicalQuery = useSessionFineArtsPractical(sessionId, true);
    const tasksQuery = useFineArtsCourseworkTasks();
    const resolveMutation = useResolveFineArtsPractical(sessionId);
    const evidenceMutation = useRecordFineArtsPracticalEvidence(sessionId);

    const contract = practicalQuery.data ?? null;
    const tasks = tasksQuery.data ?? [];
    const resolved = hasResolvedFineArtsPracticalContract(contract);
    const activeLearnerSectionEnabled = resolved && activeSection === 'learner';
    const learnerMatrixQuery = useSessionFineArtsLearnerEvidence(
        sessionId,
        activeLearnerSectionEnabled,
        'present',
    );
    const matrix = learnerMatrixQuery.data ?? null;
    const activeSectionInitialized = useRef(false);
    const showGuidedMode = guidedMode && !fullReviewOpen;

    useEffect(() => {
        setTeacherFeedbackDraft(contract?.teacher_feedback ?? '');
    }, [contract?.teacher_feedback]);

    useEffect(() => {
        if (!contract?.coursework_task?.id) {
            setSelectedTaskId('');
            return;
        }

        setSelectedTaskId(String(contract.coursework_task.id));
    }, [contract?.coursework_task?.id]);

    const canSaveTeacherFeedback = useMemo(() => (
        editable && teacherFeedbackDraft.trim() !== (contract?.teacher_feedback ?? '').trim()
    ), [contract?.teacher_feedback, editable, teacherFeedbackDraft]);

    useEffect(() => {
        if (activeSectionInitialized.current) {
            return;
        }

        if (showGuidedMode) {
            setActiveSection(contract?.session_proof_complete ? 'learner' : 'proof');
            activeSectionInitialized.current = true;
            return;
        }

        let storedActiveSection: 'proof' | 'learner' | null = null;
        if (typeof window !== 'undefined') {
            const raw = window.sessionStorage.getItem(getFineArtsWorksheetStorageKey(sessionId));
            if (raw) {
                try {
                    const parsed = JSON.parse(raw) as { activeSection?: 'proof' | 'learner' };
                    storedActiveSection = parsed.activeSection ?? null;
                } catch {
                    storedActiveSection = null;
                }
            }
        }

        if (storedActiveSection) {
            setActiveSection(storedActiveSection);
        } else if (contract?.session_proof_complete) {
            setActiveSection('learner');
        }

        activeSectionInitialized.current = true;
    }, [contract?.session_proof_complete, sessionId, showGuidedMode]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const key = getFineArtsWorksheetStorageKey(sessionId);
        let existing: Record<string, unknown> = {};
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
            try {
                existing = JSON.parse(raw) as Record<string, unknown>;
            } catch {
                existing = {};
            }
        }

        window.sessionStorage.setItem(key, JSON.stringify({
            ...existing,
            activeSection,
        }));
    }, [activeSection, sessionId]);

    useEffect(() => {
        if (!showGuidedMode) {
            return;
        }

        setActiveSection(contract?.session_proof_complete ? 'learner' : 'proof');
    }, [contract?.session_proof_complete, showGuidedMode]);

    useEffect(() => {
        const relevantReasons = new Set([
            'attendance_updated',
            'participation_updated',
            'taught_outcomes_confirmed',
            'fine_arts_practical_resolved',
            'fine_arts_practical_evidence_recorded',
            'fine_arts_learner_evidence_recorded',
            'fine_arts_learner_evidence_attachment_uploaded',
        ]);

        return subscribeToSessionDataChanged((detail) => {
            if (!detail?.sessionId || detail.sessionId !== sessionId) {
                return;
            }
            if (detail.reason && !relevantReasons.has(detail.reason)) {
                return;
            }

            void queryClient.invalidateQueries({ queryKey: cbcKeys.fineArtsPracticals.detail(sessionId) });
            void queryClient.invalidateQueries({ queryKey: ['cbc', 'fine-arts-practicals', 'learner-matrix', sessionId] });
        });
    }, [queryClient, sessionId]);

    const handleStateChange = async () => {
        await Promise.all([
            practicalQuery.refetch(),
            activeSection === 'learner' ? learnerMatrixQuery.refetch() : Promise.resolve(),
        ]);
        await onStateChange?.();
    };

    const handleResolve = async () => {
        const taskId = Number(selectedTaskId);
        if (!Number.isFinite(taskId) || taskId <= 0) {
            setError('Select the official Fine Arts coursework task for this practical session.');
            return;
        }

        try {
            setError(null);
            await resolveMutation.mutateAsync({ coursework_task_id: taskId });
            await handleStateChange();
        } catch (mutationError) {
            setError(extractErrorMessage(mutationError as ApiError));
        }
    };

    const handleToggleRequirement = async (
        evidenceType: FineArtsPracticalEvidencePayload['evidence_type'],
        recorded: boolean,
    ) => {
        try {
            setError(null);
            await evidenceMutation.mutateAsync({
                evidence_type: evidenceType,
                recorded: !recorded,
            });
            await handleStateChange();
        } catch (mutationError) {
            setError(extractErrorMessage(mutationError as ApiError));
        }
    };

    const handleSaveTeacherFeedback = async () => {
        try {
            setError(null);
            await evidenceMutation.mutateAsync({
                evidence_type: 'TEACHER_FEEDBACK',
                recorded: teacherFeedbackDraft.trim().length > 0,
                notes: teacherFeedbackDraft,
            });
            await handleStateChange();
        } catch (mutationError) {
            setError(extractErrorMessage(mutationError as ApiError));
        }
    };

    if (practicalQuery.isLoading && !contract) {
        return (
            <Card>
                <LoadingSpinner message="Loading Fine Arts practical requirements..." fullScreen={false} />
            </Card>
        );
    }

    if (practicalQuery.error) {
        return (
            <Card>
                <ErrorBanner
                    message={extractErrorMessage(practicalQuery.error as ApiError, 'We could not load the Fine Arts practical requirements.')}
                    onDismiss={() => {}}
                />
            </Card>
        );
    }

    const courseworkTask: FineArtsCourseworkTask | null = contract?.coursework_task ?? null;

    return (
        <Card>
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold theme-text">{title}</h2>
                        <p className="text-sm theme-muted">{summaryText(contract)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {resolved && courseworkTask ? (
                            <>
                            <Badge variant="default">{courseworkTask.task_code}</Badge>
                            <Badge variant="default">Term {courseworkTask.term_number}</Badge>
                            <Badge variant="default">{formatExhibitionLabel(courseworkTask.exhibition_type)}</Badge>
                            </>
                        ) : null}
                        {guidedMode && fullReviewOpen ? (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setFullReviewOpen(false)}
                            >
                                Return to guided view
                            </Button>
                        ) : null}
                    </div>
                </div>

                {error ? (
                    <ErrorBanner message={error} compact onDismiss={() => setError(null)} />
                ) : null}

                {!resolved ? (
                    <div className="space-y-4 rounded-xl border p-4 theme-border theme-surface-muted">
                        <div className="space-y-1">
                            <p className="text-sm font-medium theme-text">Official coursework task required</p>
                            <p className="text-sm theme-muted">
                                Fine Arts learner workflow stays locked until this session resolves to exactly one official coursework task.
                            </p>
                        </div>

                        {editable ? (
                            <div className="space-y-3">
                                <Select
                                    label="Fine Arts coursework task"
                                    value={selectedTaskId}
                                    onChange={(event) => setSelectedTaskId(event.target.value)}
                                    disabled={tasksQuery.isLoading || resolveMutation.isPending}
                                    options={[
                                        { value: '', label: 'Select the official Fine Arts task' },
                                        ...tasks.map((task) => ({
                                            value: task.id,
                                            label: `${task.task_code} · ${task.name} (Term ${task.term_number})`,
                                        })),
                                    ]}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            void handleResolve();
                                        }}
                                        disabled={resolveMutation.isPending || !selectedTaskId}
                                    >
                                        {resolveMutation.isPending ? 'Resolving...' : 'Resolve coursework task'}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {resolved && courseworkTask ? (
                    <>
                        {showGuidedMode ? (
                            <>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border px-4 py-3 theme-border theme-surface-muted">
                                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Coursework task</p>
                                        <p className="mt-1 text-sm font-semibold theme-text">{courseworkTask.task_code}</p>
                                        <p className="mt-1 text-xs theme-muted">{courseworkTask.name}</p>
                                    </div>
                                    <div className="rounded-xl border px-4 py-3 theme-border theme-surface-muted">
                                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Session proof</p>
                                        <p className="mt-1 text-sm font-semibold theme-text">
                                            {contract?.session_proof_complete ? 'Complete' : 'Pending'}
                                        </p>
                                        <p className="mt-1 text-xs theme-muted">
                                            {contract?.session_proof_complete
                                                ? 'Teacher proof-of-work is recorded.'
                                                : 'Finish the session proof checklist first.'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border px-4 py-3 theme-border theme-surface-muted">
                                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Learner evidence</p>
                                        <p className="mt-1 text-sm font-semibold theme-text">
                                            {contract?.learner_evidence_ready ? 'Ready' : 'Pending'}
                                        </p>
                                        <p className="mt-1 text-xs theme-muted">
                                            {contract?.learner_evidence_ready
                                                ? 'Required learner evidence is complete.'
                                                : 'Keep moving learner-by-learner until the required categories are covered.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 rounded-xl border p-4 theme-border theme-surface-muted sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold theme-text">
                                            {!contract?.session_proof_complete
                                                ? 'Step 1: complete session proof'
                                                : !contract?.learner_evidence_ready
                                                    ? 'Step 2: record learner worksheet evidence'
                                                    : 'Step 3: return to lesson closure'}
                                        </p>
                                        <p className="text-sm theme-muted">
                                            {activeSection === 'proof'
                                                ? 'Keep only the proof checklist in view until it is complete.'
                                                : 'Focus on one learner at a time and save the required evidence categories.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {activeSection === 'learner' ? (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setActiveSection('proof')}
                                            >
                                                View session proof
                                            </Button>
                                        ) : contract?.session_proof_complete ? (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setActiveSection('learner')}
                                            >
                                                Go to learner evidence
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setFullReviewOpen(true)}
                                        >
                                            Full review
                                        </Button>
                                    </div>
                                </div>

                                <details className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <summary className="cursor-pointer list-none text-sm font-medium theme-text">
                                        View task details
                                    </summary>
                                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-xl border p-4 theme-border theme-surface">
                                            <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                                <Palette className="h-4 w-4 theme-muted" />
                                                Coursework guidance
                                            </div>
                                            <dl className="mt-3 space-y-3 text-sm">
                                                <div>
                                                    <dt className="theme-subtle">Annual theme</dt>
                                                    <dd className="font-medium theme-text">{courseworkTask.annual_theme}</dd>
                                                </div>
                                                <div>
                                                    <dt className="theme-subtle">Term sub-theme</dt>
                                                    <dd className="font-medium theme-text">{courseworkTask.term_sub_theme}</dd>
                                                </div>
                                                <div>
                                                    <dt className="theme-subtle">Strand</dt>
                                                    <dd className="font-medium theme-text">{courseworkTask.strand}</dd>
                                                </div>
                                                <div>
                                                    <dt className="theme-subtle">Sub-strand</dt>
                                                    <dd className="font-medium theme-text">{courseworkTask.sub_strand}</dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <div className="rounded-xl border p-4 theme-border theme-surface">
                                            <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                                <ClipboardList className="h-4 w-4 theme-muted" />
                                                Scoring criteria
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {contract?.assessment_criteria.map((criterion) => (
                                                    <div
                                                        key={criterion.key}
                                                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm theme-border theme-surface-elevated"
                                                    >
                                                        <span className="theme-text">{criterion.label}</span>
                                                        <span className="font-semibold theme-text">{criterion.max_marks} marks</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </>
                        ) : (
                            <>
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                        <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                            <Palette className="h-4 w-4 theme-muted" />
                                            Coursework guidance
                                        </div>
                                        <dl className="mt-3 space-y-3 text-sm">
                                            <div>
                                                <dt className="theme-subtle">Annual theme</dt>
                                                <dd className="font-medium theme-text">{courseworkTask.annual_theme}</dd>
                                            </div>
                                            <div>
                                                <dt className="theme-subtle">Term sub-theme</dt>
                                                <dd className="font-medium theme-text">{courseworkTask.term_sub_theme}</dd>
                                            </div>
                                            <div>
                                                <dt className="theme-subtle">Strand</dt>
                                                <dd className="font-medium theme-text">{courseworkTask.strand}</dd>
                                            </div>
                                            <div>
                                                <dt className="theme-subtle">Sub-strand</dt>
                                                <dd className="font-medium theme-text">{courseworkTask.sub_strand}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                        <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                            <ClipboardList className="h-4 w-4 theme-muted" />
                                            Scoring criteria
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {contract?.assessment_criteria.map((criterion) => (
                                                <div
                                                    key={criterion.key}
                                                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm theme-border theme-surface-elevated"
                                                >
                                                    <span className="theme-text">{criterion.label}</span>
                                                    <span className="font-semibold theme-text">{criterion.max_marks} marks</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 rounded-xl border p-1 theme-border theme-surface-muted">
                                    <button
                                        type="button"
                                        className={`theme-focus-ring rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeSection === 'proof' ? 'theme-surface-elevated theme-text' : 'theme-muted hover:[color:var(--color-text)]'}`}
                                        onClick={() => setActiveSection('proof')}
                                    >
                                        Session proof
                                    </button>
                                    <button
                                        type="button"
                                        className={`theme-focus-ring rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeSection === 'learner' ? 'theme-surface-elevated theme-text' : 'theme-muted hover:[color:var(--color-text)]'}`}
                                        onClick={() => setActiveSection('learner')}
                                    >
                                        Learner worksheet evidence
                                    </button>
                                </div>
                            </>
                        )}

                        {activeSection === 'proof' ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                        <FolderOpen className="h-4 w-4 theme-muted" />
                                        Session proof checklist
                                    </div>
                                    <p className="mt-1 text-sm theme-muted">
                                        Keep the session-level checklist as teacher proof-of-work for the practical block.
                                    </p>
                                    <div className="mt-4 space-y-3">
                                        {contract?.requirements.map((requirement) => (
                                            <div
                                                key={requirement.key}
                                                className="flex flex-col gap-3 rounded-lg border px-4 py-3 theme-border theme-surface-elevated sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium theme-text">{requirement.label}</p>
                                                        <Badge variant="default">
                                                            {requirement.recorded ? 'Recorded' : 'Required'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs theme-subtle">{formatEvidenceLabel(requirement.evidence_type)}</p>
                                                </div>
                                                {editable ? (
                                                    <Button
                                                        type="button"
                                                        variant={requirement.recorded ? 'secondary' : 'primary'}
                                                        onClick={() => {
                                                            void handleToggleRequirement(requirement.evidence_type, requirement.recorded);
                                                        }}
                                                        disabled={evidenceMutation.isPending}
                                                    >
                                                        {requirement.recorded ? 'Undo' : 'Mark recorded'}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                        <CheckCircle2 className="h-4 w-4 theme-muted" />
                                        Additional practical records
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {contract?.additional_requirements.map((requirement) => (
                                            <div
                                                key={requirement.key}
                                                className="flex flex-col gap-3 rounded-lg border px-4 py-3 theme-border theme-surface-elevated sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium theme-text">{requirement.label}</p>
                                                    <Badge variant="default">
                                                        {requirement.recorded ? 'Recorded' : 'Optional'}
                                                    </Badge>
                                                </div>
                                                {editable ? (
                                                    <Button
                                                        type="button"
                                                        variant={requirement.recorded ? 'secondary' : 'primary'}
                                                        onClick={() => {
                                                            void handleToggleRequirement(requirement.evidence_type, requirement.recorded);
                                                        }}
                                                        disabled={evidenceMutation.isPending}
                                                    >
                                                        {requirement.recorded ? 'Undo' : 'Mark recorded'}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                        <MessageSquareText className="h-4 w-4 theme-muted" />
                                        Teacher feedback
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        <textarea
                                            value={teacherFeedbackDraft}
                                            onChange={(event) => setTeacherFeedbackDraft(event.target.value)}
                                            rows={4}
                                            disabled={!editable || evidenceMutation.isPending}
                                            className="theme-input theme-focus-ring w-full rounded-lg px-4 py-3 text-sm"
                                            placeholder="Add practical-session feedback for the coursework task..."
                                        />
                                        {editable ? (
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    disabled={!canSaveTeacherFeedback || evidenceMutation.isPending}
                                                    onClick={() => {
                                                        void handleSaveTeacherFeedback();
                                                    }}
                                                >
                                                    Save feedback
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {activeSection === 'learner' ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <div className="flex items-center gap-2 text-sm font-semibold theme-text">
                                        <Users className="h-4 w-4 theme-muted" />
                                        Learner worksheet evidence
                                    </div>
                                    <p className="mt-1 text-sm theme-muted">
                                        Record learner worksheet evidence against the coursework task and link it back to the taught outcomes before closing the session.
                                    </p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-lg border px-4 py-3 theme-border theme-surface-elevated">
                                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Present learners with evidence</p>
                                            <p className="mt-1 text-lg font-semibold theme-text">
                                                {contract?.learner_evidence_summary?.present_learners_with_evidence ?? 0}
                                                /
                                                {contract?.learner_evidence_summary?.present_learners_total ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border px-4 py-3 theme-border theme-surface-elevated">
                                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Required learner cells</p>
                                            <p className="mt-1 text-lg font-semibold theme-text">
                                                {matrix?.summary.required_cells_recorded ?? 0}
                                                /
                                                {matrix?.summary.required_cells_total ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border px-4 py-3 theme-border theme-surface-elevated">
                                            <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Required categories covered</p>
                                            <p className="mt-1 text-lg font-semibold theme-text">
                                                {((matrix?.required_evidence_types?.length ?? 0) - (contract?.learner_evidence_summary?.missing_required_evidence_types?.length ?? 0))}
                                                /
                                                {matrix?.required_evidence_types?.length ?? 0}
                                            </p>
                                        </div>
                                    </div>

                                    {!contract?.learner_evidence_ready ? (
                                        <div className="mt-4 space-y-2 rounded-lg border p-4 theme-border theme-surface">
                                            <p className="text-sm font-medium theme-text">
                                                {contract?.session_proof_complete
                                                    ? 'Session proof is complete. Record learner worksheet evidence before closing this Fine Arts practical.'
                                                    : contract?.session_proof_message ?? 'Complete the session proof checklist first.'}
                                            </p>
                                            {contract?.learner_evidence_summary?.missing_required_evidence_types?.length ? (
                                                <p className="text-sm theme-muted">
                                                    Missing evidence categories: {contract.learner_evidence_summary.missing_required_evidence_types.map(formatEvidenceLabel).join(', ')}.
                                                </p>
                                            ) : null}
                                            {contract?.learner_evidence_summary?.missing_learners?.length ? (
                                                <p className="text-sm theme-muted">
                                                    Learners still missing worksheet evidence: {contract.learner_evidence_summary.missing_learners.map((learner) => learner.name).join(', ')}.
                                                </p>
                                            ) : null}
                                            {contract?.learner_evidence_summary?.entries_missing_outcome_links?.length ? (
                                                <p className="text-sm theme-muted">
                                                    Some learner entries still need taught outcome links.
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>

                                <FineArtsLearnerWorksheetPanel
                                    sessionId={sessionId}
                                    contract={contract}
                                    matrix={matrix}
                                    editable={editable}
                                    guidedMode={showGuidedMode}
                                    isLoading={learnerMatrixQuery.isLoading}
                                    loadError={(learnerMatrixQuery.error as ApiError) ?? null}
                                    onRetry={handleStateChange}
                                    onStateChange={handleStateChange}
                                    onGoToSessionProof={() => setActiveSection('proof')}
                                />
                            </div>
                        ) : null}
                    </>
                ) : null}

                {footer}
            </div>
        </Card>
    );
}

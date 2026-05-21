'use client';

import { useMemo, useState } from 'react';
import { Users, Plus, X, AlertTriangle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { useSessionCohorts } from '@/app/core/hooks/useSessions';
import type { SessionCohort } from '@/app/core/types/session';
import { AddCohortModal } from './AddCohortModal';

function getActionErrorMessage(err: unknown, fallback: string): string {
    const error = err as {
        response?: { data?: { detail?: string } | Record<string, unknown> | string };
        message?: string;
    };
    const data = error.response?.data;

    if (typeof data === 'string') {
        return data;
    }

    if (data && typeof data === 'object') {
        if ('detail' in data && typeof data.detail === 'string') {
            return data.detail;
        }

        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                return value;
            }
            if (Array.isArray(value) && typeof value[0] === 'string') {
                return value[0];
            }
        }
    }

    return error.message ?? fallback;
}

interface ParticipatingCohortsProps {
    sessionId: number;
    isHistorical?: boolean;
    canManageLinks?: boolean;
    primaryCohort?: {
        id: number;
        name: string;
        level?: string | null;
    };
}

export function ParticipatingCohorts({
    sessionId,
    isHistorical = false,
    canManageLinks = true,
    primaryCohort,
}: ParticipatingCohortsProps) {
    const [open, setOpen] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [confirmUnlink, setConfirmUnlink] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const {
        linkedCohorts,
        activeCohorts,
        historicalCohorts,
        totalLearners,
        loading,
        linkCohortSubject,
        unlinkCohort,
    } = useSessionCohorts(sessionId);

    const activeParticipatingClasses = useMemo(() => {
        const classMap = new Map<number, SessionCohort>();

        activeCohorts.forEach((cohort) => {
            classMap.set(cohort.cohort, cohort);
        });

        if (primaryCohort && !classMap.has(primaryCohort.id)) {
            classMap.set(primaryCohort.id, {
                id: -primaryCohort.id,
                session: sessionId,
                cohort: primaryCohort.id,
                cohort_name: primaryCohort.name,
                cohort_level: primaryCohort.level ?? '',
                is_active: true,
                is_primary: true,
                created_at: '',
            });
        }

        return Array.from(classMap.values());
    }, [activeCohorts, primaryCohort, sessionId]);

    const activeClassCount = activeParticipatingClasses.length;
    const hasPrimaryClass = useMemo(() => (
        activeParticipatingClasses.some((cohort) => (
            cohort.is_primary === true
            || (primaryCohort ? cohort.cohort === primaryCohort.id : false)
        ))
    ), [activeParticipatingClasses, primaryCohort]);

    const currentLinkedClasses = useMemo(() => (
        activeParticipatingClasses.filter((cohort) => (
            cohort.is_primary !== true
            && (!primaryCohort || cohort.cohort !== primaryCohort.id)
        ))
    ), [activeParticipatingClasses, primaryCohort]);

    const handleAddCohortSubject = async (cohortSubjectId: number) => {
        setActionError(null);
        try {
            await linkCohortSubject(cohortSubjectId);
        } catch (err: unknown) {
            setActionError(getActionErrorMessage(err, 'Failed to add participating class.'));
            throw err;
        }
    };

    const handleUnlinkCohort = async (cohortId: number) => {
        setActionError(null);
        try {
            await unlinkCohort(cohortId);
            setConfirmUnlink(null);
        } catch (err: unknown) {
            setActionError(getActionErrorMessage(err, 'Failed to unlink class.'));
        }
    };

    return (
        <>
            <div className="theme-card overflow-hidden rounded-xl">
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    className="theme-hover-surface flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                    <Users className="h-4 w-4 theme-subtle shrink-0" />
                    <span className="flex-1 text-sm font-medium theme-text">
                        Participating classes
                    </span>

                    {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    ) : (
                        <div className="flex items-center gap-2 text-xs theme-muted">
                            <Badge variant="info" size="sm">
                                {activeClassCount} active
                            </Badge>
                            <span>{totalLearners} total participating learners</span>
                        </div>
                    )}

                    {open
                        ? <ChevronDown className="h-4 w-4 theme-subtle shrink-0" />
                        : <ChevronRight className="h-4 w-4 theme-subtle shrink-0" />
                    }
                </button>

                {open && (
                    <div className="space-y-4 border-t px-4 pb-4 pt-3 theme-border">
                        <div className="theme-info-surface rounded-lg px-4 py-3 text-sm">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                                <div className="space-y-1">
                                    <p className="font-medium theme-text">
                                        Linked classes participate in this session until you unlink them.
                                    </p>
                                    <p className="theme-muted">
                                        Use this when classes are combined for one lesson or for an ongoing merged teaching arrangement.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="theme-card-muted rounded-lg px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                    Active classes
                                </p>
                                <p className="mt-2 text-lg font-semibold theme-text">
                                    {activeClassCount}
                                </p>
                            </div>
                            <div className="theme-card-muted rounded-lg px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                    Total participating learners
                                </p>
                                <p className="mt-2 text-lg font-semibold theme-text">
                                    {totalLearners}
                                </p>
                            </div>
                        </div>

                        {actionError ? (
                            <div className="theme-danger-surface flex items-center gap-2 rounded-lg p-2 text-xs">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-danger)]" />
                                <span className="flex-1">{actionError}</span>
                                <button type="button" onClick={() => setActionError(null)}>
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : null}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold theme-text">Active participating classes</h3>
                                <span className="text-xs theme-muted">
                                    {currentLinkedClasses.length === 0 && hasPrimaryClass
                                        ? 'Primary class only'
                                        : `${currentLinkedClasses.length} linked`}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {activeParticipatingClasses.map((link) => {
                                    const isPrimary = link.is_primary === true || (primaryCohort ? link.cohort === primaryCohort.id : false);
                                    const isConfirming = confirmUnlink === link.cohort;

                                    return (
                                        <div
                                            key={`${link.id}-${link.cohort}`}
                                            className={`rounded-lg border px-3 py-3 ${
                                                isPrimary
                                                    ? 'theme-info-surface'
                                                    : 'theme-border theme-surface'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="truncate text-sm font-medium theme-text">
                                                            {link.cohort_name}
                                                        </span>
                                                        <Badge variant={isPrimary ? 'blue' : 'green'} size="sm">
                                                            {isPrimary ? 'Primary' : 'Participating'}
                                                        </Badge>
                                                        {!isPrimary ? (
                                                            <Badge variant="default" size="sm">Linked</Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-sm theme-muted">
                                                        {link.cohort_level || 'Class level not set'}
                                                        {typeof link.learner_count === 'number'
                                                            ? ` · ${link.learner_count} learners`
                                                            : ''}
                                                    </p>
                                                    {!isPrimary ? (
                                                        <p className="text-xs theme-subtle">
                                                            This class stays linked until you unlink it.
                                                        </p>
                                                    ) : null}
                                                </div>

                                                {!isPrimary && !isHistorical && canManageLinks ? (
                                                    isConfirming ? (
                                                        <div className="flex flex-col gap-2 sm:items-end">
                                                            <span className="text-xs theme-muted">Unlink this class?</span>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    onClick={() => handleUnlinkCohort(link.cohort)}
                                                                >
                                                                    Confirm
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setConfirmUnlink(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmUnlink(link.cohort)}
                                                            className="rounded p-1.5 theme-subtle transition-colors theme-hover-danger"
                                                            title="Unlink class"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {historicalCohorts.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold theme-text">Historical / unlinked classes</h3>
                                    <span className="text-xs theme-muted">{historicalCohorts.length} unlinked</span>
                                </div>

                                <div className="space-y-2">
                                    {historicalCohorts.map((link) => (
                                        <div
                                            key={link.id}
                                            className="theme-card-muted rounded-lg px-3 py-3"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium theme-text">
                                                    {link.cohort_name}
                                                </span>
                                                <Badge variant="default" size="sm">Unlinked</Badge>
                                                <Badge variant="warning" size="sm">Historical</Badge>
                                            </div>
                                            <p className="mt-1 text-sm theme-muted">
                                                {link.cohort_level || 'Class level not set'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {linkedCohorts.length > 0 ? (
                            <p className="text-xs theme-subtle">
                                Unlinking a class does not remove attendance records already recorded for this session.
                            </p>
                        ) : null}

                        {!isHistorical && canManageLinks ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowAddModal(true)}
                                className="w-full"
                            >
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                Add participating class
                            </Button>
                        ) : null}
                    </div>
                )}
            </div>

            <AddCohortModal
                sessionId={sessionId}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAddCohortSubject={handleAddCohortSubject}
            />
        </>
    );
}

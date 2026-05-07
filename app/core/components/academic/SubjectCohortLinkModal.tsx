'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortSubjectAPI } from '@/app/core/api/academic';
import {
    useCohorts,
    useSubjectCohortLinks,
    useSubjectDetail,
} from '@/app/core/hooks/useAcademic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Cohort, Subject } from '@/app/core/types/academic';

interface SubjectCohortLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject: Subject | null;
    onLinkChanged?: () => Promise<void> | void;
}

function getCohortDisplayName(cohort: Cohort | null): string {
    if (!cohort) return 'the selected cohort';
    return `${cohort.name} ${cohort.academic_year_name}`.trim();
}

export function SubjectCohortLinkModal({
    isOpen,
    onClose,
    subject,
    onLinkChanged,
}: SubjectCohortLinkModalProps) {
    const queryClient = useQueryClient();
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const [isCompulsory, setIsCompulsory] = useState(true);
    const [working, setWorking] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [hasRetriedResolution, setHasRetriedResolution] = useState(false);
    const [dismissedLoadError, setDismissedLoadError] = useState<string | null>(null);

    const cohortFilters = useMemo(() => {
        if (!subject) return undefined;

        const normalizedLevel = subject.level.trim().toLowerCase();
        return {
            curriculum: subject.curriculum,
            ...(normalizedLevel && normalizedLevel !== 'all'
                ? { level: subject.level }
                : {}),
        };
    }, [subject]);

    const {
        cohorts,
        loading: cohortsLoading,
        error: cohortsError,
        refetch: refetchCohorts,
    } = useCohorts(cohortFilters);
    const {
        subject: subjectDetail,
        loading: subjectDetailLoading,
        error: subjectDetailError,
        refetch: refetchSubjectDetail,
    } = useSubjectDetail(subject?.id ?? null);
    const {
        cohortSubjects,
        loading: cohortSubjectsLoading,
        error: cohortSubjectsError,
        refetch: refetchCohortSubjects,
    } = useSubjectCohortLinks(subject?.id ? { subject: subject.id } : undefined);

    const selectedCohort = useMemo(
        () => cohorts.find(c => c.id === selectedCohortId) ?? null,
        [cohorts, selectedCohortId]
    );

    const selectedOffering = useMemo(
        () =>
            subjectDetail?.cohorts_offering.find(
                offering => offering.cohort_id === selectedCohortId
            ) ?? null,
        [selectedCohortId, subjectDetail]
    );

    const existingLink = useMemo(
        () =>
            cohortSubjects.find(
                link => link.subject === subject?.id && link.cohort === selectedCohortId
            ) ?? null,
        [cohortSubjects, selectedCohortId, subject?.id]
    );

    const isAlreadyLinked = Boolean(selectedOffering || existingLink);
    const isResolutionBlocked = Boolean(
        selectedOffering &&
        !existingLink &&
        !cohortSubjectsLoading &&
        hasRetriedResolution
    );
    const currentLinkIsCompulsory =
        selectedOffering?.is_compulsory ?? existingLink?.is_compulsory ?? null;
    const loadError = cohortsError ?? subjectDetailError ?? cohortSubjectsError ?? null;
    const visibleLoadError = loadError && loadError !== dismissedLoadError ? loadError : null;

    useEffect(() => {
        if (!isOpen) {
            setSelectedCohortId(null);
            setIsCompulsory(true);
            setActionError(null);
            setHasRetriedResolution(false);
            setDismissedLoadError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        setIsCompulsory(true);
        setActionError(null);
        setHasRetriedResolution(false);
        setDismissedLoadError(null);
    }, [subject?.id]);

    useEffect(() => {
        setActionError(null);
        setHasRetriedResolution(false);
    }, [selectedCohortId]);

    useEffect(() => {
        if (!loadError) {
            setDismissedLoadError(null);
        }
    }, [loadError]);

    useEffect(() => {
        if (!isOpen || cohorts.length === 0) {
            setSelectedCohortId(null);
            return;
        }

        setSelectedCohortId(prev => {
            if (prev && cohorts.some(c => c.id === prev)) return prev;

            const linkedIds = new Set(
                (subjectDetail?.cohorts_offering ?? []).map(offering => offering.cohort_id)
            );

            return cohorts.find(c => linkedIds.has(c.id) && c.is_current_year)?.id
                ?? cohorts.find(c => linkedIds.has(c.id))?.id
                ?? cohorts.find(c => c.is_current_year)?.id
                ?? cohorts[0].id;
        });
    }, [cohorts, isOpen, subjectDetail]);

    useEffect(() => {
        if (
            !isOpen ||
            !selectedOffering ||
            existingLink ||
            cohortSubjectsLoading ||
            hasRetriedResolution
        ) {
            return;
        }

        setHasRetriedResolution(true);
        void refetchCohortSubjects();
    }, [
        cohortSubjectsLoading,
        existingLink,
        hasRetriedResolution,
        isOpen,
        refetchCohortSubjects,
        selectedOffering,
    ]);

    const invalidateRelatedQueries = async () => {
        const invalidations: Promise<unknown>[] = [
            queryClient.invalidateQueries({ queryKey: academicKeys.subjects.all }),
            queryClient.invalidateQueries({ queryKey: academicKeys.cohortSubjects.all }),
            queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.all }),
        ];

        if (subject?.id) {
            invalidations.push(
                queryClient.invalidateQueries({
                    queryKey: academicKeys.subjects.detail(subject.id),
                })
            );
        }

        if (selectedCohortId) {
            invalidations.push(
                queryClient.invalidateQueries({
                    queryKey: academicKeys.cohorts.detail(selectedCohortId),
                })
            );
        }

        await Promise.allSettled(invalidations);
    };

    const refreshAll = async () => {
        await Promise.allSettled([
            refetchCohorts(),
            refetchSubjectDetail(),
            refetchCohortSubjects(),
            Promise.resolve(onLinkChanged?.()),
        ]);
    };

    const handleRefresh = async () => {
        setActionError(null);
        await Promise.allSettled([invalidateRelatedQueries(), refreshAll()]);
    };

    const handleLink = async () => {
        if (!subject || !selectedCohortId) {
            setActionError('Select a cohort to link this subject.');
            return;
        }

        if (isAlreadyLinked) {
            setActionError(
                `${subject.name} is already linked to ${getCohortDisplayName(selectedCohort)}.`
            );
            return;
        }

        setWorking(true);
        setActionError(null);

        try {
            await cohortSubjectAPI.create({
                cohort: selectedCohortId,
                subject: subject.id,
                is_compulsory: isCompulsory,
            });
            await Promise.allSettled([invalidateRelatedQueries(), refreshAll()]);
            onClose();
        } catch (err) {
            setActionError(
                extractErrorMessage(
                    err as ApiError,
                    'Failed to link subject to cohort.'
                )
            );
        } finally {
            setWorking(false);
        }
    };

    const handleUnlink = async () => {
        if (!subject || !selectedCohortId) {
            setActionError('Select a cohort to unlink this subject.');
            return;
        }

        if (!existingLink) {
            setActionError(
                `${subject.name} is linked to ${getCohortDisplayName(selectedCohort)}, but the cohort subject record could not be resolved. Refresh and try again.`
            );
            return;
        }

        setWorking(true);
        setActionError(null);

        try {
            await cohortSubjectAPI.delete(existingLink.id);
            await Promise.allSettled([invalidateRelatedQueries(), refreshAll()]);
            onClose();
        } catch (err) {
            setActionError(
                extractErrorMessage(
                    err as ApiError,
                    'Failed to unlink subject from cohort.'
                )
            );
        } finally {
            setWorking(false);
        }
    };

    const modalTitle = subject
        ? isAlreadyLinked
            ? `Manage ${subject.name} Cohort Link`
            : `Link ${subject.name} to Cohort`
        : 'Manage Subject Cohort Link';

    const cohortOptions = cohorts.map(cohort => ({
            value: String(cohort.id),
            label: `${cohort.name} — ${cohort.academic_year_name}${cohort.is_current_year ? '' : ' (Historical)'}`,
        }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            {!subject ? null : (
                <div className="space-y-4">
                    {actionError && (
                        <ErrorBanner
                            message={actionError}
                            onDismiss={() => setActionError(null)}
                        />
                    )}

                    {visibleLoadError && (
                        <ErrorBanner
                            message={visibleLoadError}
                            onDismiss={() => setDismissedLoadError(visibleLoadError)}
                        />
                    )}

                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">{subject.name}</p>
                        <p className="text-xs text-gray-500">
                            {subject.code} · {subject.level} · {subject.curriculum_name}
                        </p>
                    </div>

                    <Select
                        label="Cohort"
                        value={selectedCohortId?.toString() ?? ''}
                        onChange={e => setSelectedCohortId(
                            e.target.value ? Number(e.target.value) : null
                        )}
                        disabled={working || cohortsLoading || cohorts.length === 0}
                        options={[
                            {
                                value: '',
                                label: cohortsLoading
                                    ? 'Loading cohorts...'
                                    : cohorts.length === 0
                                        ? 'No compatible cohorts available'
                                        : 'Select a cohort',
                            },
                            ...cohortOptions,
                        ]}
                    />

                    {(subjectDetailLoading || cohortSubjectsLoading) && (
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Checking existing cohort links...
                        </div>
                    )}

                    {isAlreadyLinked && selectedCohort && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-2">
                                    <p>
                                        {subject.name} is already linked to{' '}
                                        {getCohortDisplayName(selectedCohort)}.
                                    </p>
                                    <p>
                                        You can unlink it here, or manage subject learners from the cohort subject page.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isResolutionBlocked && selectedCohort && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <p>
                                {subject.name} is linked to {getCohortDisplayName(selectedCohort)},
                                but the cohort subject record could not be resolved for unlinking.
                            </p>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="mt-3"
                                onClick={handleRefresh}
                                disabled={working}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh Link Data
                            </Button>
                        </div>
                    )}

                    {!isAlreadyLinked && (
                        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                            <input
                                type="checkbox"
                                checked={isCompulsory}
                                onChange={e => setIsCompulsory(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                                disabled={working}
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    Mark as compulsory
                                </p>
                                <p className="text-xs text-gray-500">
                                    Applies only when creating the cohort subject link.
                                </p>
                            </div>
                        </label>
                    )}

                    {isAlreadyLinked && currentLinkIsCompulsory !== null && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Current Link Metadata
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                                {currentLinkIsCompulsory ? 'Compulsory subject' : 'Optional subject'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Compulsory status is read-only here.
                            </p>
                        </div>
                    )}

                    {cohorts.length === 0 && !cohortsLoading && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                            No compatible cohorts were found for this subject.
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={working}
                        >
                            Cancel
                        </Button>

                        {isAlreadyLinked && !isResolutionBlocked ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={handleUnlink}
                                disabled={working || !selectedCohortId}
                            >
                                {working ? 'Unlinking...' : 'Unlink from Cohort'}
                            </Button>
                        ) : !isAlreadyLinked ? (
                            <Button
                                type="button"
                                onClick={handleLink}
                                disabled={working || !selectedCohortId || cohorts.length === 0}
                            >
                                {working ? 'Linking...' : 'Link Subject to Cohort'}
                            </Button>
                        ) : null}
                    </div>
                </div>
            )}
        </Modal>
    );
}

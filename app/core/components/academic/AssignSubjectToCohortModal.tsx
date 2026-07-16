'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortAPI } from '@/app/core/api/academic';
import { useCohorts } from '@/app/core/hooks/useAcademic';
import { getRegisteredCbcPathwayApi } from '@/app/core/registry/cbcPathwayRegistry';
import {
    isCbcSeniorSchoolEntity,
    normalizeAcademicLevel,
} from '@/app/core/lib/cbcSeniorSchool';
import type {
    CbcAllowedSubject,
    CbcCohortAllowedSubjects,
} from '@/app/core/types/cbcPathways';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Cohort, CohortSubject, Subject } from '@/app/core/types/academic';

export type AssignableSubjectTarget = Pick<
    Subject,
    'id' | 'name' | 'code' | 'level' | 'curriculum' | 'curriculum_name' | 'curriculum_type'
>;

interface AssignSubjectToCohortModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject: AssignableSubjectTarget | null;
    onAssigned?: (assignment: CohortSubject, cohortId: number) => void | Promise<void>;
}

interface CohortAssignmentTarget {
    cohort: Cohort;
    alreadyLinked: boolean;
    disabledReason: string | null;
    setupRequired: boolean;
}

function buildCohortOptionLabel(target: CohortAssignmentTarget): string {
    const baseLabel = `${target.cohort.name} · ${target.cohort.academic_year_name}`;
    return target.disabledReason ? `${baseLabel} — ${target.disabledReason}` : baseLabel;
}

function matchesAllowedSubject(subject: AssignableSubjectTarget, candidate: CbcAllowedSubject): boolean {
    return (
        (candidate.subject_id !== null && candidate.subject_id === subject.id)
        || candidate.subject_code === subject.code
    );
}

function resolveCbcSubjectEligibility(
    subject: AssignableSubjectTarget,
    snapshot: CbcCohortAllowedSubjects | null,
): string | null {
    if (!snapshot) {
        return 'Could not verify allowed CBC subjects for this cohort right now.';
    }

    const blockedSubject = snapshot.blocked.find((candidate) => matchesAllowedSubject(subject, candidate));
    if (blockedSubject) {
        return blockedSubject.blocked_reason
            ?? blockedSubject.reason
            ?? 'This subject is not allowed for the cohort pathway configuration.';
    }

    const allowedSubject = [...snapshot.core, ...snapshot.pathway_subjects]
        .find((candidate) => matchesAllowedSubject(subject, candidate));

    if (!allowedSubject) {
        return 'This subject is not allowed for the cohort pathway configuration.';
    }

    if (allowedSubject.locked) {
        return allowedSubject.blocked_reason ?? allowedSubject.reason ?? 'This CBC subject is locked for the cohort.';
    }

    if (allowedSubject.subject_id === null) {
        return allowedSubject.blocked_reason ?? allowedSubject.reason ?? 'Subject mirror is not available yet.';
    }

    return null;
}

export function AssignSubjectToCohortModal({
    isOpen,
    onClose,
    subject,
    onAssigned,
}: AssignSubjectToCohortModalProps) {
    const [selectedCohortId, setSelectedCohortId] = useState('');
    const [isCompulsory, setIsCompulsory] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cohortTargets, setCohortTargets] = useState<CohortAssignmentTarget[]>([]);
    const [checkingTargets, setCheckingTargets] = useState(false);

    const isCbcSeniorSubject = isCbcSeniorSchoolEntity(subject);
    const cbcPathwayApi = getRegisteredCbcPathwayApi();
    const { cohorts, loading: cohortsLoading } = useCohorts(
        subject ? { curriculum: subject.curriculum } : undefined,
        { enabled: isOpen && Boolean(subject) }
    );

    useEffect(() => {
        if (!isOpen) return;
        setSelectedCohortId('');
        setIsCompulsory(true);
        setError(null);
    }, [isOpen, subject?.id]);

    const availableCohorts = useMemo(() => {
        if (!subject) return [];

        const currentYearCohorts = cohorts.filter((cohort) => cohort.is_current_year);
        const matchingLevel = currentYearCohorts.filter(
            (cohort) => normalizeAcademicLevel(cohort.level) === normalizeAcademicLevel(subject.level)
        );

        if (isCbcSeniorSubject) {
            return matchingLevel;
        }

        return matchingLevel.length > 0 ? matchingLevel : currentYearCohorts;
    }, [cohorts, isCbcSeniorSubject, subject]);

    useEffect(() => {
        let active = true;

        if (!isOpen || !subject || availableCohorts.length === 0) {
            setCohortTargets([]);
            setCheckingTargets(false);
            return () => {
                active = false;
            };
        }

        setCheckingTargets(true);

        void Promise.all(
            availableCohorts.map(async (cohort) => {
                try {
                    const [detail, allowedSubjects] = await Promise.all([
                        cohortAPI.getById(cohort.id),
                        isCbcSeniorSubject
                            ? (
                                cohort.cbc_profile
                                    ? cbcPathwayApi?.getCohortAllowedSubjects(cohort.id) ?? Promise.resolve(null)
                                    : Promise.resolve(null)
                            )
                            : Promise.resolve(null),
                    ]);

                    const alreadyLinked = detail.subjects.some((cohortSubject) => cohortSubject.subject === subject.id);
                    const setupRequired = isCbcSeniorSubject && !cohort.cbc_profile;

                    let disabledReason: string | null = null;
                    if (alreadyLinked) {
                        disabledReason = 'Subject already linked.';
                    } else if (setupRequired) {
                        disabledReason = 'Configure CBC pathway before linking pathway subjects.';
                    } else if (isCbcSeniorSubject) {
                        disabledReason = resolveCbcSubjectEligibility(subject, allowedSubjects);
                    }

                    return {
                        cohort,
                        alreadyLinked,
                        disabledReason,
                        setupRequired,
                    } satisfies CohortAssignmentTarget;
                } catch (err) {
                    return {
                        cohort,
                        alreadyLinked: false,
                        disabledReason: resolveErrorMessage(err as ApiError, 'Could not verify this cohort right now.'),
                        setupRequired: false,
                    } satisfies CohortAssignmentTarget;
                }
            })
        ).then((targets) => {
            if (!active) {
                return;
            }

            setCohortTargets(targets);
        }).finally(() => {
            if (active) {
                setCheckingTargets(false);
            }
        });

        return () => {
            active = false;
        };
    }, [availableCohorts, cbcPathwayApi, isCbcSeniorSubject, isOpen, subject]);

    const selectedTarget = useMemo(
        () => cohortTargets.find((target) => String(target.cohort.id) === selectedCohortId) ?? null,
        [cohortTargets, selectedCohortId],
    );
    const selectableTargets = useMemo(
        () => cohortTargets.filter((target) => !target.disabledReason),
        [cohortTargets],
    );
    const setupRequiredTargets = useMemo(
        () => cohortTargets.filter((target) => target.setupRequired),
        [cohortTargets],
    );
    const duplicateTargets = useMemo(
        () => cohortTargets.filter((target) => target.alreadyLinked),
        [cohortTargets],
    );
    const otherBlockedTargets = useMemo(
        () => cohortTargets.filter((target) => target.disabledReason && !target.setupRequired && !target.alreadyLinked),
        [cohortTargets],
    );

    const handleClose = () => {
        if (saving) return;
        setError(null);
        onClose();
    };

    const handleAssign = async () => {
        if (!subject || !selectedCohortId) {
            setError('Choose a cohort before linking this subject.');
            return;
        }

        if (!selectedTarget || selectedTarget.disabledReason) {
            setError(selectedTarget?.disabledReason ?? 'This cohort is not available for subject linking.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const assignment = await cohortAPI.assignSubject(selectedTarget.cohort.id, subject.id, isCompulsory);
            await onAssigned?.(assignment, selectedTarget.cohort.id);
            onClose();
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to link subject to cohort.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={subject ? `Link ${subject.name} to Cohort` : 'Link Subject to Cohort'}
            size="md"
        >
            <div className="space-y-4">
                {subject ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                        <p className="font-medium text-blue-900">
                            {subject.code} - {subject.name}
                        </p>
                        <p className="mt-1">
                            {isCbcSeniorSubject
                                ? `Select a Grade 10-12 CBC cohort that is configured for this subject pathway before creating the cohort subject offering for ${subject.level}.`
                                : `Select a cohort in ${subject.curriculum_name} to create a cohort subject offering for ${subject.level}.`}
                        </p>
                    </div>
                ) : null}

                {error ? (
                    <ErrorBanner message={error} onDismiss={() => setError(null)} />
                ) : null}

                <Select
                    label="Cohort"
                    value={selectedCohortId}
                    onChange={(event) => {
                        setSelectedCohortId(event.target.value);
                        setError(null);
                    }}
                    disabled={cohortsLoading || checkingTargets || !subject}
                    options={[
                        {
                            value: '',
                            label: cohortsLoading
                                ? 'Loading cohorts...'
                                : checkingTargets
                                    ? 'Checking cohort setup...'
                                    : 'Select cohort...',
                        },
                        ...cohortTargets.map((target) => ({
                            value: String(target.cohort.id),
                            label: buildCohortOptionLabel(target),
                            disabled: Boolean(target.disabledReason),
                        })),
                    ]}
                />

                {setupRequiredTargets.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-900">
                            CBC cohorts that need setup first
                        </p>
                        <div className="space-y-3">
                            {setupRequiredTargets.map((target) => (
                                <div key={target.cohort.id} className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-amber-900">{target.cohort.name}</p>
                                        <p className="text-xs text-amber-800">Configure CBC pathway before linking pathway subjects.</p>
                                    </div>
                                    <Link href={`/academic/cohorts/${target.cohort.id}`} className="shrink-0">
                                        <Button type="button" variant="secondary" size="sm">
                                            Open Setup
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {!checkingTargets && duplicateTargets.length > 0 ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                        {duplicateTargets.length === 1
                            ? '1 cohort already has this subject, so it stays disabled in the list.'
                            : `${duplicateTargets.length} cohorts already have this subject, so they stay disabled in the list.`}
                    </div>
                ) : null}

                {otherBlockedTargets.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-900">Unavailable cohorts</p>
                        <div className="space-y-3">
                            {otherBlockedTargets.map((target) => (
                                <div key={target.cohort.id} className="space-y-1">
                                    <p className="text-sm font-medium text-gray-900">{target.cohort.name}</p>
                                    <p className="text-xs text-gray-600">{target.disabledReason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <input
                        type="checkbox"
                        checked={isCompulsory}
                        onChange={(event) => setIsCompulsory(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">Mark as compulsory</p>
                        <p className="text-xs text-gray-500">
                            Turn this off if the subject should be created as an optional cohort offering.
                        </p>
                    </div>
                </label>

                {selectedTarget?.disabledReason ? (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-1">
                            <p className="font-medium text-amber-900">
                                {selectedTarget.cohort.name} is not available for this subject yet.
                            </p>
                            <p>{selectedTarget.disabledReason}</p>
                        </div>
                    </div>
                ) : null}

                {!cohortsLoading && !checkingTargets && subject && availableCohorts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                        {isCbcSeniorSubject
                            ? `No current Grade 10-12 CBC cohorts are available for ${subject.level}.`
                            : `No current cohorts are available for ${subject.level} in ${subject.curriculum_name}.`}
                    </div>
                ) : null}

                {!cohortsLoading && !checkingTargets && subject && availableCohorts.length > 0 && selectableTargets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                        {isCbcSeniorSubject
                            ? 'No current CBC senior cohort is ready for this subject yet.'
                            : `Every matching current cohort is unavailable for ${subject.name} right now.`}
                    </div>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAssign}
                        disabled={!subject || !selectedTarget || Boolean(selectedTarget.disabledReason) || saving}
                    >
                        {saving ? 'Linking...' : 'Link Subject to Cohort'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

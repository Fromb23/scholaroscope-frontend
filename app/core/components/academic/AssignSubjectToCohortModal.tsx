'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortAPI } from '@/app/core/api/academic';
import { useCohortDetail, useCohorts } from '@/app/core/hooks/useAcademic';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { CohortSubject, Subject } from '@/app/core/types/academic';

export type AssignableSubjectTarget = Pick<
    Subject,
    'id' | 'name' | 'code' | 'level' | 'curriculum' | 'curriculum_name'
>;

interface AssignSubjectToCohortModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject: AssignableSubjectTarget | null;
    onAssigned?: (assignment: CohortSubject, cohortId: number) => void | Promise<void>;
}

function normalizeLevel(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
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

    const { cohorts, loading: cohortsLoading } = useCohorts(
        subject ? { curriculum: subject.curriculum } : undefined,
        { enabled: isOpen && Boolean(subject) }
    );
    const selectedCohort = selectedCohortId ? Number(selectedCohortId) : null;
    const { cohort: cohortDetail, loading: cohortDetailLoading } = useCohortDetail(
        isOpen && selectedCohort ? selectedCohort : null
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
            (cohort) => normalizeLevel(cohort.level) === normalizeLevel(subject.level)
        );

        return matchingLevel.length > 0 ? matchingLevel : currentYearCohorts;
    }, [cohorts, subject]);

    const alreadyLinked = Boolean(
        subject
        && cohortDetail?.subjects.some((cohortSubject) => cohortSubject.subject === subject.id)
    );

    const handleClose = () => {
        if (saving) return;
        setError(null);
        onClose();
    };

    const handleAssign = async () => {
        if (!subject || !selectedCohort) {
            setError('Choose a cohort before linking this subject.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const assignment = await cohortAPI.assignSubject(selectedCohort, subject.id, isCompulsory);
            await onAssigned?.(assignment, selectedCohort);
            setError(null);
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to link subject to cohort.'));
        } finally {
            setSaving(false);
        }
    };

    const selectedCohortLabel = cohortDetail?.name || availableCohorts.find(
        (cohort) => cohort.id === selectedCohort
    )?.name;

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
                            Select a cohort in {subject.curriculum_name} to create a cohort subject offering for {subject.level}.
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
                    disabled={cohortsLoading || !subject}
                    options={[
                        { value: '', label: cohortsLoading ? 'Loading cohorts...' : 'Select cohort...' },
                        ...availableCohorts.map((cohort) => ({
                            value: String(cohort.id),
                            label: `${cohort.name} · ${cohort.academic_year_name}`,
                        })),
                    ]}
                />

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

                {selectedCohort && cohortDetailLoading ? (
                    <p className="text-sm text-gray-500">Checking existing cohort subjects...</p>
                ) : null}

                {selectedCohort && !cohortDetailLoading && alreadyLinked ? (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-1">
                            <p className="font-medium text-amber-900">
                                {subject?.name} is already linked to {selectedCohortLabel}.
                            </p>
                            <p>Choose a different cohort or manage the existing cohort subject from the cohort control center.</p>
                        </div>
                    </div>
                ) : null}

                {!cohortsLoading && subject && availableCohorts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                        No current cohorts are available for {subject.level} in {subject.curriculum_name}.
                    </div>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAssign}
                        disabled={!subject || !selectedCohort || saving || alreadyLinked}
                    >
                        {saving ? 'Linking...' : 'Link Subject to Cohort'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

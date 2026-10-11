'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { cohortAPI } from '@/app/core/api/academic';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { CohortSubjectPanelContext } from '@/app/core/registry/cohortSubjectPanels';
import { cbcPathwayAPI } from '@/app/plugins/cbc/api/pathways';
import type {
    CbcAllowedSubject,
    CbcCohortAllowedSubjects,
} from '@/app/plugins/cbc/types/pathways';

function statusVariant(label?: string | null) {
    switch (label) {
        case 'Added to class':
            return 'green' as const;
        case 'Required':
            return 'blue' as const;
        case 'Ready to add':
            return 'info' as const;
        case 'Needs curriculum import':
        case 'Import requested':
            return 'warning' as const;
        case 'Not allowed for this class':
            return 'default' as const;
        default:
            return 'default' as const;
    }
}

function SubjectRow({
    subject,
    isHistorical,
    working,
    onAdd,
    onRemove,
}: {
    subject: CbcAllowedSubject;
    isHistorical: boolean;
    working: boolean;
    onAdd: (subject: CbcAllowedSubject) => void;
    onRemove: (subject: CbcAllowedSubject) => void;
}) {
    const addedToClass = Boolean(subject.added_to_class);
    const canAdd = !addedToClass && Boolean(subject.ui_action_label);
    const canRemove = addedToClass && !subject.locked;
    const needsCurriculumImport = subject.is_content_ready === false;
    const statusLabel = needsCurriculumImport
        ? 'Content not ready'
        : subject.ui_status_label;

    return (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{subject.subject_name}</p>
                    <span className="font-mono text-xs text-gray-500">{subject.subject_code}</span>
                    {statusLabel ? (
                        <Badge variant={statusVariant(statusLabel)} size="sm">
                            {statusLabel}
                        </Badge>
                    ) : null}
                    {subject.ui_requirement_label ? (
                        <Badge variant={statusVariant(subject.ui_requirement_label)} size="sm">
                            {subject.ui_requirement_label}
                        </Badge>
                    ) : null}
                </div>
                {subject.ui_note ? (
                    <p className="text-xs text-gray-600">{subject.ui_note}</p>
                ) : null}
            </div>

            {needsCurriculumImport ? (
                <Link className="text-xs font-medium text-blue-600 hover:text-blue-700" href="/academic/subjects">
                    Open subject catalogue
                </Link>
            ) : null}

            {!isHistorical && !needsCurriculumImport && (canAdd || canRemove) ? (
                <Button
                    type="button"
                    size="sm"
                    variant={canRemove ? 'secondary' : 'primary'}
                    disabled={working}
                    onClick={() => (canRemove ? onRemove(subject) : onAdd(subject))}
                >
                    {canRemove ? 'Remove' : subject.ui_action_label}
                </Button>
            ) : null}
        </div>
    );
}

export function CBCCohortSubjectPanel({
    cohortId,
    isHistorical,
    onSubjectsChanged,
}: CohortSubjectPanelContext) {
    const [snapshot, setSnapshot] = useState<CbcCohortAllowedSubjects | null>(null);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadSnapshot = useCallback(async () => {
        setLoading(true);
        try {
            const allowed = await cbcPathwayAPI.getCohortAllowedSubjects(cohortId);
            setSnapshot(allowed);
            setError(null);
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to load class subject setup.'));
        } finally {
            setLoading(false);
        }
    }, [cohortId]);

    useEffect(() => {
        void loadSnapshot();
    }, [loadSnapshot]);


    const handleAddSubject = async (subject: CbcAllowedSubject) => {
        setWorking(true);
        setSuccessMessage(null);
        setError(null);

        try {
            const response = await cohortAPI.assignSubject(
                cohortId,
                subject.subject_id,
                subject.category === 'CORE',
                { subjectProfileId: subject.subject_profile_id },
            );
            await loadSnapshot();
            await onSubjectsChanged?.();
            setSuccessMessage(response.message ?? 'Subject added to class.');
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to add subject to class.'));
        } finally {
            setWorking(false);
        }
    };

    const handleRemoveSubject = async (subject: CbcAllowedSubject) => {
        if (!subject.subject_id) return;

        setWorking(true);
        setSuccessMessage(null);
        setError(null);

        try {
            await cohortAPI.removeSubject(cohortId, subject.subject_id);
            await loadSnapshot();
            await onSubjectsChanged?.();
            setSuccessMessage('Subject removed from class.');
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to remove subject from class.'));
        } finally {
            setWorking(false);
        }
    };

    if (loading) {
        return (
            <div className="py-6 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!snapshot) {
        return null;
    }

    return (
        <div className="space-y-5">
            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {successMessage}
                </div>
            ) : null}

            {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">Class Subject Setup</p>
                    <Badge variant={snapshot.summary.status === 'READY' ? 'green' : 'warning'} size="sm">
                        {snapshot.summary.status_label}
                    </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-700">{snapshot.summary.description}</p>
            </div>

            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-900">Required Subjects</h3>
                </div>
                <p className="text-sm text-gray-600">
                    These subjects are compulsory for all learners in this class.
                </p>
                {snapshot.core.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        Required subjects will appear here after the class pathway is saved.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {snapshot.core.map((subject) => (
                            <SubjectRow
                                key={`core:${subject.subject_profile_id}`}
                                subject={subject}
                                isHistorical={isHistorical}
                                working={working}
                                onAdd={handleAddSubject}
                                onRemove={handleRemoveSubject}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <h3 className="text-base font-semibold text-gray-900">Subjects This Class Can Offer</h3>
                </div>
                <p className="text-sm text-gray-600">
                    Choose the subjects available for this class.
                </p>

                {snapshot.pathway_allowed_subjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        {snapshot.pathway
                            ? 'No extra subjects are ready to add yet.'
                            : 'Choose the pathway above to see the subjects this class can offer.'}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {snapshot.pathway_allowed_subjects.map((subject) => (
                            <SubjectRow
                                key={`pathway:${subject.subject_profile_id}`}
                                subject={subject}
                                isHistorical={isHistorical}
                                working={working}
                                onAdd={handleAddSubject}
                                onRemove={handleRemoveSubject}
                            />
                        ))}
                    </div>
                )}

            </section>

            {isHistorical ? (
                <p className="text-center text-xs text-gray-400">
                    This class is from a past academic year and its subject setup is read-only.
                </p>
            ) : null}
        </div>
    );
}

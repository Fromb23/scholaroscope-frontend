'use client';

import Modal from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { Assessment } from '@/app/core/types/assessment';

function formatAssessmentDate(value: string | null): string {
    if (!value) {
        return 'No date set';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString();
}

interface LearnerAssessmentPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    assessments: Assessment[];
    onSelect: (assessment: Assessment) => void;
}

export function LearnerAssessmentPickerModal({
    isOpen,
    onClose,
    assessments,
    onSelect,
}: LearnerAssessmentPickerModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Assessment" size="lg">
            <div className="space-y-4">
                {assessments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                        No open assessments are available for this learner.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {assessments.map((assessment) => (
                            <button
                                key={assessment.id}
                                type="button"
                                onClick={() => onSelect(assessment)}
                                className="theme-focus-ring w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 space-y-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                                            {assessment.name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {assessment.subject_code} · {assessment.subject_name}
                                        </p>
                                    </div>
                                    <Badge variant="info">{assessment.status_display}</Badge>
                                </div>
                                <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
                                    <div>
                                        <p className="font-medium text-gray-900">Cohort</p>
                                        <p>{assessment.cohort_name}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Assessment Date</p>
                                        <p>{formatAssessmentDate(assessment.assessment_date)}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Status</p>
                                        <p>{assessment.status_display}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex justify-end">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

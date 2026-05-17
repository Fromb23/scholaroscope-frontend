'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Save } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AssessmentPolicyPreviewCard } from '@/app/core/components/assessments/AssessmentPolicyPreviewCard';
import { assessmentAPI } from '@/app/core/api/assessments';
import { useAssessmentDetail, useRubricScales } from '@/app/core/hooks/useAssessments';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts, useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import {
    ASSESSMENT_TYPE_OPTIONS,
    AssessmentFormData,
    AssessmentStatus,
} from '@/app/core/types/assessment';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import { useAuth } from '@/app/context/AuthContext';

const EVALUATION_TYPES = [
    { value: 'NUMERIC', label: 'Numeric (Marks-based)' },
    { value: 'RUBRIC', label: 'Rubric (Level-based)' },
    { value: 'DESCRIPTIVE', label: 'Descriptive' },
    { value: 'COMPETENCY', label: 'Competency' },
];

type InstructorSubjectOption = {
    id: number;
    cohort_id: number;
    cohort_name: string;
    cohort_label: string;
    subject_label: string;
};

export function EditAssessmentPage() {
    const params = useParams();
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const assessmentId = Number(params.id);
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';

    const [selectedCohortId, setSelectedCohortId] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { assessment, loading, error } = useAssessmentDetail(assessmentId);
    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const { subjects } = useCohortSubjects(selectedCohortId || undefined);
    const { rubricScales } = useRubricScales();

    const assignedSubjectOptions = useMemo<InstructorSubjectOption[]>(() => {
        const options = instructorAccess.assignments
            .filter((assignment) => typeof assignment.cohort_subject_id === 'number')
            .map((assignment) => ({
                id: assignment.cohort_subject_id as number,
                cohort_id: assignment.cohort_id,
                cohort_name: assignment.cohort_name,
                cohort_label: `${assignment.cohort_name} — ${assignment.level ?? assignment.academic_year ?? ''}`.trim(),
                subject_label: `${assignment.subject_code ?? assignment.subject_name} — ${assignment.subject_name}`,
            }));

        return Array.from(new Map(options.map((option) => [option.id, option])).values()).sort(
            (left, right) => left.subject_label.localeCompare(right.subject_label)
        );
    }, [instructorAccess.assignments]);

    const allowedCohortSubjectIds = useMemo(
        () => assignedSubjectOptions.map((option) => option.id),
        [assignedSubjectOptions]
    );

    const [formData, setFormData] = useState<AssessmentFormData>({
        cohort_subject: 0,
        term: null,
        name: '',
        assessment_type: 'CAT',
        evaluation_type: 'NUMERIC',
        total_marks: 100,
        rubric_scale: null,
        assessment_date: new Date().toISOString().split('T')[0],
        description: '',
    });

    useEffect(() => {
        if (!assessment) return;

        setSelectedCohortId(assessment.cohort_id);
        setFormData({
            cohort_subject: assessment.cohort_subject,
            term: assessment.term,
            name: assessment.name,
            assessment_type: assessment.assessment_type,
            evaluation_type: assessment.evaluation_type,
            total_marks: assessment.total_marks,
            rubric_scale: assessment.rubric_scale,
            assessment_date: assessment.assessment_date,
            description: assessment.description,
        });
    }, [assessment]);

    const isFinalized = assessment?.status === AssessmentStatus.FINALIZED;
    const canUpdateAssessment = assessment?.can_update ?? (
        Boolean(assessment)
        && !isFinalized
        && (isAdminLike || (
            isInstructor
            && allowedCohortSubjectIds.includes(assessment?.cohort_subject ?? 0)
        ))
    );

    const assignedCohorts = useMemo(() => (
        Array.from(
            new Map(
                assignedSubjectOptions.map((option) => [
                    option.cohort_id,
                    {
                        id: option.cohort_id,
                        label: option.cohort_label,
                        name: option.cohort_name,
                    },
                ])
            ).values()
        ).sort((left, right) => left.label.localeCompare(right.label))
    ), [assignedSubjectOptions]);

    const availableCohorts = isInstructor
        ? assignedCohorts.map((cohort) => ({
            id: cohort.id,
            name: cohort.label,
            level: '',
        }))
        : cohorts;

    const availableSubjects = useMemo(() => {
        if (isInstructor) {
            return assignedSubjectOptions
                .filter((option) => option.cohort_id === selectedCohortId)
                .map((option) => ({
                    id: option.id,
                    label: option.subject_label,
                }));
        }

        return subjects.map((subject) => ({
            id: subject.id,
            label: `${subject.subject_code} — ${subject.subject_name}${subject.is_compulsory ? ' (Core)' : ''}`,
        }));
    }, [assignedSubjectOptions, isInstructor, selectedCohortId, subjects]);

    const handleChange = <K extends keyof AssessmentFormData>(
        field: K,
        value: AssessmentFormData[K]
    ) => {
        setFormData((previous) => {
            const updated = { ...previous, [field]: value };
            if (field === 'evaluation_type') {
                if (value === 'NUMERIC') {
                    updated.rubric_scale = null;
                    updated.total_marks = 100;
                }
                if (value === 'RUBRIC') {
                    updated.total_marks = null;
                }
            }
            return updated;
        });

        if (errors[field as string]) {
            setErrors((previous) => {
                const next = { ...previous };
                delete next[field as string];
                return next;
            });
        }
    };

    const selectCohort = (cohortId: number) => {
        setSelectedCohortId(cohortId);
        setFormData((previous) => ({ ...previous, cohort_subject: 0 }));
    };

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};

        if (!selectedCohortId) nextErrors.cohort = 'Cohort is required';
        if (!formData.cohort_subject) nextErrors.cohort_subject = 'Subject is required';
        if (
            isInstructor
            && formData.cohort_subject
            && !allowedCohortSubjectIds.includes(formData.cohort_subject)
        ) {
            nextErrors.cohort_subject = 'You are not assigned to this cohort subject';
        }
        if (!formData.name.trim()) nextErrors.name = 'Assessment name is required';
        if (formData.evaluation_type === 'NUMERIC' && !formData.total_marks) {
            nextErrors.total_marks = 'Total marks required for numeric assessments';
        }
        if (formData.evaluation_type === 'RUBRIC' && !formData.rubric_scale) {
            nextErrors.rubric_scale = 'Rubric scale required for rubric assessments';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canUpdateAssessment) {
            setSaveError('You do not have permission to update this assessment.');
            return;
        }
        if (!validateForm()) return;

        setSaving(true);
        setSaveError(null);
        try {
            await assessmentAPI.update(assessmentId, formData);
            router.push(`/assessments/${assessmentId}`);
        } catch (err) {
            setSaveError(
                extractErrorMessage(err as ApiError, 'Failed to update assessment')
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return <ErrorBanner message={error} onDismiss={() => undefined} />;
    }

    if (!assessment) {
        return <div className="p-10 text-gray-500">Assessment not found.</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href={`/assessments/${assessmentId}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Assessment
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Assessment</h1>
                    <p className="text-gray-600 mt-1">Update assessment facts for this cohort subject</p>
                </div>
            </div>

            {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

            {!canUpdateAssessment && (
                <Card>
                    <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                        This assessment is read-only for your account.
                    </div>
                </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <ClipboardList className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Select
                                    label="Cohort"
                                    value={selectedCohortId.toString()}
                                    onChange={(e) => selectCohort(Number(e.target.value))}
                                    required
                                    disabled={!canUpdateAssessment}
                                    options={[
                                        { value: '0', label: 'Select Cohort' },
                                        ...availableCohorts.map((cohort) => ({
                                            value: String(cohort.id),
                                            label: cohort.level ? `${cohort.name} — ${cohort.level}` : cohort.name,
                                        })),
                                    ]}
                                />
                                {errors.cohort && <p className="mt-1 text-sm text-red-600">{errors.cohort}</p>}
                            </div>

                            <div>
                                <Select
                                    label="Subject"
                                    value={formData.cohort_subject.toString()}
                                    onChange={(e) => handleChange('cohort_subject', Number(e.target.value))}
                                    required
                                    disabled={!selectedCohortId || !canUpdateAssessment}
                                    options={[
                                        {
                                            value: '0',
                                            label: selectedCohortId ? 'Select Subject' : 'Select a cohort first',
                                        },
                                        ...availableSubjects.map((subject) => ({
                                            value: String(subject.id),
                                            label: subject.label,
                                        })),
                                    ]}
                                />
                                {errors.cohort_subject && (
                                    <p className="mt-1 text-sm text-red-600">{errors.cohort_subject}</p>
                                )}
                            </div>

                            <div>
                                <Input
                                    label="Assessment Name"
                                    placeholder="e.g., CAT 1, Mid-Term Exam"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required
                                    disabled={!canUpdateAssessment}
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                            </div>

                            <Select
                                label="Assessment Type"
                                value={formData.assessment_type}
                                onChange={(e) => handleChange('assessment_type', e.target.value)}
                                required
                                options={ASSESSMENT_TYPE_OPTIONS}
                                disabled={!canUpdateAssessment}
                            />

                            <div>
                                <Select
                                    label="Term (Optional)"
                                    value={formData.term?.toString() ?? ''}
                                    onChange={(e) => handleChange('term', e.target.value ? Number(e.target.value) : null)}
                                    disabled={!canUpdateAssessment}
                                    options={[
                                        { value: '', label: 'No Term (Year-round)' },
                                        ...terms.map((term) => ({
                                            value: String(term.id),
                                            label: `${term.academic_year_name} — ${term.name}`,
                                        })),
                                    ]}
                                />
                            </div>

                            <Input
                                label="Assessment Date"
                                type="date"
                                value={formData.assessment_date || ''}
                                onChange={(e) => handleChange('assessment_date', e.target.value)}
                                disabled={!canUpdateAssessment}
                            />
                        </div>
                    </div>
                </Card>

                <AssessmentPolicyPreviewCard
                    cohortId={selectedCohortId || null}
                    cohortSubjectId={formData.cohort_subject || null}
                    termId={formData.term}
                />

                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Evaluation Settings</h2>
                        <div className="space-y-6">
                            <Select
                                label="Evaluation Type"
                                value={formData.evaluation_type}
                                onChange={(e) => handleChange('evaluation_type', e.target.value)}
                                required
                                options={EVALUATION_TYPES}
                                disabled={!canUpdateAssessment}
                            />

                            {formData.evaluation_type === 'NUMERIC' && (
                                <div>
                                    <Input
                                        label="Total Marks"
                                        type="number"
                                        min="1"
                                        value={formData.total_marks ?? ''}
                                        onChange={(e) => handleChange('total_marks', e.target.value ? parseFloat(e.target.value) : null)}
                                        required
                                        disabled={!canUpdateAssessment}
                                    />
                                    {errors.total_marks && (
                                        <p className="mt-1 text-sm text-red-600">{errors.total_marks}</p>
                                    )}
                                </div>
                            )}

                            {formData.evaluation_type === 'RUBRIC' && (
                                <div>
                                    <Select
                                        label="Rubric Scale"
                                        value={formData.rubric_scale?.toString() ?? ''}
                                        onChange={(e) => handleChange('rubric_scale', e.target.value ? Number(e.target.value) : null)}
                                        required
                                        disabled={!canUpdateAssessment}
                                        options={[
                                            { value: '', label: 'Select Rubric Scale' },
                                            ...rubricScales
                                                .filter((scale) => scale.is_active)
                                                .map((scale) => ({
                                                    value: String(scale.id),
                                                    label: `${scale.name} (${scale.curriculum_name})`,
                                                })),
                                        ]}
                                    />
                                    {errors.rubric_scale && (
                                        <p className="mt-1 text-sm text-red-600">{errors.rubric_scale}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={4}
                            placeholder="Add assessment objectives, topics covered, or any additional notes."
                            disabled={!canUpdateAssessment}
                        />
                    </div>
                </Card>

                <div className="flex items-center justify-end gap-4">
                    <Link href={`/assessments/${assessmentId}`}>
                        <Button type="button" variant="ghost">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={saving || !canUpdateAssessment}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

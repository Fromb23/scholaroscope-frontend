'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Save } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { CurriculumLifecycleAccessState } from '@/app/core/components/curriculum/CurriculumLifecycleAccessState';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AssessmentPolicyPreviewCard } from '@/app/core/components/assessments/AssessmentPolicyPreviewCard';
import { useCreateAssessmentForm, useRubricScales } from '@/app/core/hooks/useAssessments';
import { useCurricula, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts, useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useScrollIntoViewOnMessage } from '@/app/core/hooks/useScrollIntoViewOnMessage';
import { canCreateCurriculumWork, resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import { ASSESSMENT_TYPE_OPTIONS } from '@/app/core/types/assessment';
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
    curriculum_id: number | null;
    curriculum_type: string | null;
};

export function CreateAssessmentPage() {
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const { curricula } = useCurricula();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isAdminLike = Boolean(user?.is_superadmin) || activeRole === 'ADMIN';

    const assignedSubjectOptions = useMemo<InstructorSubjectOption[]>(() => {
        const options = instructorAccess.assignments
            .filter((assignment) => typeof assignment.cohort_subject_id === 'number')
            .map((assignment) => ({
                id: assignment.cohort_subject_id as number,
                cohort_id: assignment.cohort_id,
                cohort_name: assignment.cohort_name,
                cohort_label: `${assignment.cohort_name} — ${assignment.level ?? assignment.academic_year ?? ''}`.trim(),
                subject_label: `${assignment.subject_code ?? assignment.subject_name} — ${assignment.subject_name}`,
                curriculum_id: assignment.curriculum_id ?? null,
                curriculum_type: assignment.curriculum_type ?? null,
            }));

        return Array.from(new Map(options.map((option) => [option.id, option])).values()).sort(
            (left, right) => left.subject_label.localeCompare(right.subject_label)
        );
    }, [instructorAccess.assignments]);

    const writableAssignedSubjectOptions = useMemo(
        () => assignedSubjectOptions.filter((option) => {
            const curriculum = typeof option.curriculum_id === 'number'
                ? (curricula.find((entry) => entry.id === option.curriculum_id) ?? null)
                : resolveCurriculumForType(curricula, option.curriculum_type);
            return canCreateCurriculumWork(curriculum);
        }),
        [assignedSubjectOptions, curricula]
    );
    const allowedCohortSubjectIds = useMemo(
        () => writableAssignedSubjectOptions.map((option) => option.id),
        [writableAssignedSubjectOptions]
    );

    const {
        form,
        errors,
        saving,
        saveError,
        selectedCohortId,
        setField,
        selectCohort,
        submit,
        dismissError,
    } = useCreateAssessmentForm({
        allowedCohortSubjectIds,
        enforceAssignedSubject: isInstructor,
    });

    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const { subjects } = useCohortSubjects(selectedCohortId || undefined);
    const { rubricScales } = useRubricScales();
    const saveErrorRef = useScrollIntoViewOnMessage(saveError);

    const assignedCohorts = useMemo(() => (
        Array.from(
            new Map(
                writableAssignedSubjectOptions.map((option) => [
                    option.cohort_id,
                    {
                        id: option.cohort_id,
                        label: option.cohort_label,
                        name: option.cohort_name,
                        curriculum_id: option.curriculum_id,
                        curriculum_type: option.curriculum_type,
                    },
                ])
            ).values()
        ).sort((left, right) => left.label.localeCompare(right.label))
    ), [writableAssignedSubjectOptions]);

    const availableCohorts = useMemo(() => {
        if (isInstructor) {
            return assignedCohorts.map((cohort) => ({
                id: cohort.id,
                name: cohort.label,
                level: '',
                curriculum: cohort.curriculum_id ?? null,
                curriculum_type: cohort.curriculum_type ?? null,
            }));
        }

        return cohorts
            .filter((cohort) => {
                const curriculum = curricula.find((entry) => entry.id === cohort.curriculum) ?? null;
                return canCreateCurriculumWork(curriculum);
            })
            .map((cohort) => ({
                ...cohort,
                curriculum: cohort.curriculum,
                curriculum_type: cohort.curriculum_type,
            }));
    }, [assignedCohorts, cohorts, curricula, isInstructor]);

    const availableSubjects = useMemo(() => {
        if (isInstructor) {
            return writableAssignedSubjectOptions
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
    }, [isInstructor, selectedCohortId, subjects, writableAssignedSubjectOptions]);

    const selectedCurriculum = useMemo(() => {
        const selectedCohort = availableCohorts.find((cohort) => cohort.id === selectedCohortId);
        if (!selectedCohort) {
            return null;
        }

        if (typeof selectedCohort.curriculum === 'number') {
            return curricula.find((entry) => entry.id === selectedCohort.curriculum) ?? null;
        }

        return resolveCurriculumForType(curricula, selectedCohort.curriculum_type);
    }, [availableCohorts, curricula, selectedCohortId]);
    const isSelectedCurriculumWritable = selectedCurriculum ? canCreateCurriculumWork(selectedCurriculum) : true;

    useEffect(() => {
        if (!isInstructor) return;
        if (assignedSubjectOptions.length === 1) {
            const only = assignedSubjectOptions[0];
            if (selectedCohortId !== only.cohort_id) {
                selectCohort(only.cohort_id);
            }
            if (form.cohort_subject !== only.id) {
                setField('cohort_subject', only.id);
            }
            return;
        }
        if (!selectedCohortId && assignedCohorts.length === 1) {
            selectCohort(assignedCohorts[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignedCohorts, assignedSubjectOptions, form.cohort_subject, isInstructor, selectedCohortId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSelectedCurriculumWritable) {
            return;
        }
        const result = await submit();
        if (result) router.push(`/assessments/${result.id}`);
    };

    if (isInstructor && !instructorAccess.hasAssignedCohortSubjects) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/assessments">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Assessments
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Create New Assessment</h1>
                        <p className="text-gray-500 mt-1">Set up a new assessment for your students</p>
                    </div>
                </div>

                <Card>
                    <div className="p-6">
                        <p className="text-sm text-gray-600">
                            No assigned subjects available for assessment creation.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    if ((isInstructor ? assignedSubjectOptions.length > 0 : cohorts.length > 0) && availableCohorts.length === 0) {
        return (
            <CurriculumLifecycleAccessState
                title="Assessment creation is unavailable"
                message="All available curricula are currently blocked for new work. Historical assessment records remain readable."
                backHref="/assessments"
                backLabel="Back to Assessments"
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/assessments">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Assessments
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Assessment</h1>
                    <p className="text-gray-500 mt-1">Record assessment facts for the selected cohort subject</p>
                </div>
            </div>

            {selectedCurriculum && selectedCurriculum.offering_status !== 'ACTIVE' ? (
                <CurriculumLifecycleNotice
                    status={selectedCurriculum.offering_status}
                    role={isInstructor ? 'INSTRUCTOR' : 'ADMIN'}
                    title="Assessment creation status"
                />
            ) : null}

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
                                    disabled={isInstructor && assignedCohorts.length === 1}
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
                                    value={form.cohort_subject.toString()}
                                    onChange={(e) => setField('cohort_subject', Number(e.target.value))}
                                    required
                                    disabled={!selectedCohortId || !isSelectedCurriculumWritable || (isInstructor && writableAssignedSubjectOptions.length === 1)}
                                    error={errors.cohort_subject}
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
                            </div>

                            <div>
                                <Input
                                    label="Assessment Name"
                                    placeholder="e.g., CAT 1, Mid-Term Exam"
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                    required
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                            </div>

                            <Select
                                label="Assessment Type"
                                value={form.assessment_type}
                                onChange={e => setField('assessment_type', e.target.value)}
                                required
                                options={ASSESSMENT_TYPE_OPTIONS}
                            />

                            <div>
                                <Select
                                    label="Term (Optional)"
                                    value={form.term?.toString() ?? ''}
                                    onChange={e => setField('term', e.target.value ? Number(e.target.value) : null)}
                                    disabled={!form.cohort_subject}
                                    options={[
                                        { value: '', label: 'No Term (Year-round)' },
                                        ...terms.map((term) => ({
                                            value: String(term.id),
                                            label: `${term.academic_year_name} — ${term.name}`,
                                        })),
                                    ]}
                                />
                                <p className="mt-1 text-xs text-gray-500">Optional for year-round assessment flows.</p>
                            </div>

                            <Input
                                label="Assessment Date"
                                type="date"
                                value={form.assessment_date}
                                onChange={e => setField('assessment_date', e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <AssessmentPolicyPreviewCard
                    cohortId={selectedCohortId || null}
                    cohortSubjectId={form.cohort_subject || null}
                    termId={form.term}
                />

                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Evaluation Settings</h2>
                        <div className="space-y-6">
                            <Select
                                label="Evaluation Type"
                                value={form.evaluation_type}
                                onChange={e => setField('evaluation_type', e.target.value)}
                                required
                                options={EVALUATION_TYPES}
                            />

                            {form.evaluation_type === 'NUMERIC' && (
                                <div>
                                    <Input
                                        label="Total Marks"
                                        type="number"
                                        min="1"
                                        value={form.total_marks ?? ''}
                                        onChange={e => setField('total_marks', e.target.value ? parseFloat(e.target.value) : null)}
                                        required
                                    />
                                    {errors.total_marks && <p className="mt-1 text-sm text-red-600">{errors.total_marks}</p>}
                                </div>
                            )}

                            {form.evaluation_type === 'RUBRIC' && (
                                <div>
                                    <Select
                                        label="Rubric Scale"
                                        value={form.rubric_scale?.toString() ?? ''}
                                        onChange={e => setField('rubric_scale', e.target.value ? Number(e.target.value) : null)}
                                        required
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
                                    {errors.rubric_scale && <p className="mt-1 text-sm text-red-600">{errors.rubric_scale}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={form.description}
                                onChange={e => setField('description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Add assessment objectives, topics covered, or any additional notes."
                            />
                        </div>
                    </div>
                </Card>

                {saveError ? (
                    <ErrorBanner
                        ref={saveErrorRef}
                        message={saveError}
                        onDismiss={dismissError}
                        autoDismissMs={5000}
                    />
                ) : null}

                <div className="flex items-center justify-end gap-4">
                    <Link href="/assessments">
                        <Button type="button" variant="ghost">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={saving || (!isAdminLike && !isInstructor) || !isSelectedCurriculumWritable}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Creating…' : 'Create Assessment'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Save } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { CurriculumLifecycleAccessState } from '@/app/core/components/curriculum/CurriculumLifecycleAccessState';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useToast } from '@/app/components/ui/toast/useToast';
import { AssessmentPolicyPreviewCard } from '@/app/core/components/assessments/AssessmentPolicyPreviewCard';
import { useCurriculumLifecycleGuard } from '@/app/core/hooks/useCurriculumLifecycleGuard';
import { assessmentAPI } from '@/app/core/api/assessments';
import { useAssessmentDetail, useRubricScales } from '@/app/core/hooks/useAssessments';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts, useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import {
    ASSESSMENT_TYPE_OPTIONS,
    AssessmentFormData,
    AssessmentGovernance,
    AssessmentParticipationMode,
    AssessmentStatus,
    getAssessmentGovernanceLabel,
    getAssessmentObjectiveText,
    isLearnerAssessmentDetail,
} from '@/app/core/types/assessment';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';
import { resolveReportError } from '@/app/core/errors';
import type { AcademicPolicyBrief } from '@/app/core/types/policyGuidance';
import { useAuth } from '@/app/context/AuthContext';
import { hasPermission } from '@/app/utils/permissions';

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
    const { showToast } = useToast();
    const { activeOperatingContext, capabilities } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const assessmentId = Number(params.id);
    const teachingSurface = activeOperatingContext === 'MY_TEACHING' && instructorAccess.isTeachingActor;
    const assessmentManagementSurface = activeOperatingContext === 'WORKSPACE_MANAGEMENT'
        && (
            Boolean(capabilities.can_manage_assessments)
            || hasPermission(capabilities, 'assessments.manage')
            || hasPermission(capabilities, 'assessments.review')
        );

    const [selectedCohortId, setSelectedCohortId] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [, setSaveError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [policyGuidance, setPolicyGuidance] = useState<AcademicPolicyBrief | null>(null);
    const [policyGuidanceLoading, setPolicyGuidanceLoading] = useState(false);
    const [policyGuidanceError, setPolicyGuidanceError] = useState<string | null>(null);

    const { assessment, loading, error } = useAssessmentDetail(assessmentId);
    const staffAssessment = assessment && !isLearnerAssessmentDetail(assessment)
        ? assessment
        : null;
    const lifecycle = useCurriculumLifecycleGuard({
        curriculumId: staffAssessment?.curriculum_id ?? null,
        curriculumType: staffAssessment?.curriculum_type ?? staffAssessment?.cohort_curriculum_type ?? null,
        routeIntent: 'edit',
        allowWhenNoCurriculum: true,
    });
    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const { subjects } = useCohortSubjects(selectedCohortId || undefined);

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
        governance: AssessmentGovernance.POLICY_GOVERNED,
        evaluation_type: 'NUMERIC',
        total_marks: 100,
        rubric_scale: null,
        assessment_date: new Date().toISOString().split('T')[0],
        description: '',
        participation_mode: AssessmentParticipationMode.NONE,
    });
    const { rubricScales } = useRubricScales(undefined, {
        enabled: formData.evaluation_type === 'RUBRIC',
    });

    useEffect(() => {
        if (!staffAssessment) return;

        setSelectedCohortId(staffAssessment.cohort_id);
        setFormData({
            cohort_subject: staffAssessment.cohort_subject,
            term: staffAssessment.term,
            name: staffAssessment.name,
            assessment_type: staffAssessment.assessment_type,
            governance: staffAssessment.governance ?? AssessmentGovernance.POLICY_GOVERNED,
            report_component_key: staffAssessment.report_component_key ?? null,
            evaluation_type: staffAssessment.evaluation_type,
            total_marks: staffAssessment.total_marks,
            rubric_scale: staffAssessment.rubric_scale,
            assessment_date: staffAssessment.assessment_date,
            description: staffAssessment.description,
            objective_source: staffAssessment.objective_source,
            objective_provider: staffAssessment.objective_provider,
            objective_reference_id: staffAssessment.objective_reference_id,
            teacher_defined_objective: staffAssessment.teacher_defined_objective,
            participation_mode: staffAssessment.participation_mode,
        });
    }, [staffAssessment]);

    const isFinalized = staffAssessment?.status === AssessmentStatus.FINALIZED;
    const isQuickAssessment = formData.governance === AssessmentGovernance.FORMATIVE;
    const isSchoolAssessment = formData.governance !== AssessmentGovernance.FORMATIVE;
    const objectiveText = staffAssessment ? getAssessmentObjectiveText(staffAssessment) : '';
    const canUpdateAssessment = staffAssessment?.can_update ?? (
        Boolean(staffAssessment)
        && !isFinalized
        && (assessmentManagementSurface || (
            teachingSurface
            && allowedCohortSubjectIds.includes(staffAssessment?.cohort_subject ?? 0)
        ))
    );
    const isCbcPolicyContext = (
        staffAssessment?.curriculum_type === 'CBE'
        || staffAssessment?.curriculum_type === 'CBC'
        || staffAssessment?.cohort_curriculum_type === 'CBE'
        || staffAssessment?.cohort_curriculum_type === 'CBC'
    );
    const isSchoolCbcPolicyContext = isSchoolAssessment && isCbcPolicyContext;
    const allowedAssessmentTypes = useMemo(
        () => policyGuidance?.allowed_assessment_types ?? [],
        [policyGuidance],
    );
    const assessmentTypeOptions = useMemo(() => {
        if (!allowedAssessmentTypes.length) {
            return ASSESSMENT_TYPE_OPTIONS;
        }

        const allowed = new Set(allowedAssessmentTypes.map((type) => type.toUpperCase()));
        return ASSESSMENT_TYPE_OPTIONS.filter((option) => allowed.has(String(option.value).toUpperCase()));
    }, [allowedAssessmentTypes]);
    const unsupportedAssessmentType = Boolean(
        canUpdateAssessment
        && allowedAssessmentTypes.length
        && formData.assessment_type
        && !allowedAssessmentTypes
            .map((type) => type.toUpperCase())
            .includes(formData.assessment_type.toUpperCase()),
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

    const availableCohorts = teachingSurface
        ? assignedCohorts.map((cohort) => ({
            id: cohort.id,
            name: cohort.label,
            level: '',
        }))
        : cohorts;

    const availableSubjects = useMemo(() => {
        if (teachingSurface) {
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
    }, [assignedSubjectOptions, selectedCohortId, subjects, teachingSurface]);

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

    useEffect(() => {
        if (!canUpdateAssessment || !isSchoolCbcPolicyContext || !formData.term || !formData.cohort_subject) {
            setPolicyGuidance(null);
            setPolicyGuidanceError(null);
            setPolicyGuidanceLoading(false);
            return;
        }

        let cancelled = false;
        setPolicyGuidanceLoading(true);
        setPolicyGuidanceError(null);

        assessmentAPI.getPolicyGuidance({
            term: formData.term,
            cohort_subject: formData.cohort_subject,
        }).then((guidance) => {
            if (!cancelled) {
                setPolicyGuidance(guidance);
            }
        }).catch((error) => {
            if (cancelled) return;
            const resolved = resolveReportError(error, {
                action: 'load',
                entityLabel: 'assessment policy guidance',
            });
            setPolicyGuidance(null);
            setPolicyGuidanceError(
                resolved.serverCode === 'policy_required'
                    ? 'Create or activate a term policy before creating official assessments.'
                    : resolved.message,
            );
        }).finally(() => {
            if (!cancelled) {
                setPolicyGuidanceLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        canUpdateAssessment,
        formData.cohort_subject,
        formData.term,
        isSchoolCbcPolicyContext,
        teachingSurface,
    ]);

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};

        if (!selectedCohortId) nextErrors.cohort = 'Cohort is required';
        if (!formData.cohort_subject) nextErrors.cohort_subject = 'Subject is required';
        if (
            teachingSurface
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
            const message = 'You do not have permission to update this assessment.';
            setSaveError(message);
            showToast({
                severity: 'error',
                title: 'Assessment not updated',
                message,
                autoDismissMs: false,
            });
            return;
        }
        if (isSchoolCbcPolicyContext && formData.term && formData.cohort_subject && (policyGuidanceError || policyGuidanceLoading)) {
            return;
        }
        if (unsupportedAssessmentType) {
            const message = `This term policy allows ${allowedAssessmentTypes.join(', ')} only.`;
            setSaveError(message);
            showToast({
                severity: 'warning',
                title: 'Assessment not updated',
                message,
                autoDismissMs: false,
            });
            return;
        }
        if (!validateForm()) return;

        setSaving(true);
        setSaveError(null);
        try {
            await assessmentAPI.update(assessmentId, {
                cohort_subject: formData.cohort_subject,
                term: formData.term,
                name: formData.name,
                assessment_type: formData.assessment_type,
                evaluation_type: formData.evaluation_type,
                total_marks: formData.total_marks,
                rubric_scale: formData.rubric_scale,
                assessment_date: formData.assessment_date,
                description: formData.description,
                participation_mode: formData.participation_mode,
            });
            router.push(`/assessments/${assessmentId}`);
        } catch (err) {
            const message = resolveErrorMessage(err as ApiError, 'Failed to update assessment');
            setSaveError(message);
            showToast({
                severity: 'error',
                title: 'Assessment not updated',
                message,
                autoDismissMs: false,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" fullScreen={false} message="Loading assessment editor" showMessage={false} />
            </div>
        );
    }

    if (error) {
        return <ErrorBanner message={error} onDismiss={() => undefined} />;
    }

    if (assessment && !staffAssessment) {
        return (
            <CurriculumLifecycleAccessState
                title="Assessment editing is unavailable"
                status={null}
                message="This assessment editor is restricted to authorized staff."
                backHref={`/assessments/${assessmentId}`}
                backLabel="View Assessment"
            />
        );
    }

    if (!staffAssessment) {
        return <div className="p-10 text-gray-500">Assessment not found.</div>;
    }

    if (!lifecycle.allowed) {
        return (
            <CurriculumLifecycleAccessState
                title="Assessment editing is unavailable"
                status={lifecycle.curriculum?.offering_status ?? null}
                message={lifecycle.message}
                backHref={`/assessments/${assessmentId}`}
                backLabel="View Assessment"
            />
        );
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
                    <p className="text-gray-600 mt-1">
                        Update {getAssessmentGovernanceLabel(formData.governance).toLowerCase()} facts for this cohort subject
                    </p>
                </div>
            </div>

            {lifecycle.curriculum && lifecycle.curriculum.offering_status !== 'ACTIVE' ? (
                <CurriculumLifecycleNotice
                    status={lifecycle.curriculum.offering_status}
                    surface={lifecycle.surface}
                    title="Assessment edit status"
                    message={lifecycle.message}
                />
            ) : null}

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

                        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Assessment category
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {getAssessmentGovernanceLabel(formData.governance)}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                                {isQuickAssessment
                                    ? 'Quick assessment category cannot be changed after creation.'
                                    : 'School assessment category cannot be changed after creation.'}
                            </p>
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

                            {isSchoolAssessment ? (
                                <>
                                    <Select
                                        label="Assessment Type"
                                        value={unsupportedAssessmentType ? '' : formData.assessment_type}
                                        onChange={(e) => handleChange('assessment_type', e.target.value)}
                                        required
                                        options={[
                                            ...(allowedAssessmentTypes.length
                                                ? [{ value: '', label: 'Select policy allowed type', disabled: true }]
                                                : []),
                                            ...assessmentTypeOptions,
                                        ]}
                                        disabled={!canUpdateAssessment || policyGuidanceLoading || Boolean(policyGuidanceError)}
                                    />
                                    {unsupportedAssessmentType ? (
                                        <p className="text-sm text-red-600">
                                            This term policy allows {allowedAssessmentTypes.join(', ')} only.
                                        </p>
                                    ) : null}
                                </>
                            ) : null}

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

                            {canUpdateAssessment && isSchoolCbcPolicyContext && formData.term && formData.cohort_subject ? (
                                <div className="md:col-span-2">
                                    {policyGuidanceError ? (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                            {policyGuidanceError}
                                        </div>
                                    ) : policyGuidance ? (
                                        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                                            <p className="font-medium">
                                                This term uses {policyGuidance.policy_name ?? 'the active report policy'}.
                                            </p>
                                            <p className="mt-1">
                                                Allowed this term: {(policyGuidance.allowed_assessment_types ?? []).join(', ') || 'None'}
                                            </p>
                                            <p>
                                                Required: {(policyGuidance.required_components ?? []).join(', ') || 'None'}
                                            </p>
                                        </div>
                                    ) : policyGuidanceLoading ? (
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                            Loading active policy guidance...
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

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

                {isQuickAssessment ? (
                    <Card>
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900">Learning objective</h2>
                            <p className="mt-2 text-sm text-gray-700">
                                {objectiveText || 'No learning objective was returned for this assessment.'}
                            </p>
                            <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                                This assessment does not affect official school report grades.
                            </p>
                        </div>
                    </Card>
                ) : (
                    <AssessmentPolicyPreviewCard
                        cohortId={selectedCohortId || null}
                        cohortSubjectId={formData.cohort_subject || null}
                        termId={formData.term}
                    />
                )}

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
                    <Button
                        type="submit"
                        disabled={
                            saving
                            || !canUpdateAssessment
                            || (isSchoolCbcPolicyContext && formData.term && formData.cohort_subject && (policyGuidanceLoading || Boolean(policyGuidanceError)))
                            || unsupportedAssessmentType
                        }
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

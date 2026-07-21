'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseAppDestination } from '@/app/core/auth/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckSquare, ClipboardList, Save, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { CurriculumLifecycleAccessState } from '@/app/core/components/curriculum/CurriculumLifecycleAccessState';
import { CurriculumLifecycleNotice } from '@/app/core/components/curriculum/CurriculumLifecycleNotice';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ActionStateBanner } from '@/app/components/ui/actions';
import { AssessmentPolicyPreviewCard } from '@/app/core/components/assessments/AssessmentPolicyPreviewCard';
import { assessmentAPI } from '@/app/core/api/assessments';
import { useCreateAssessmentForm, useRubricScales } from '@/app/core/hooks/useAssessments';
import { useCurricula, useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts, useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useScrollIntoViewOnMessage } from '@/app/core/hooks/useScrollIntoViewOnMessage';
import { tracksAssessmentParticipation } from '@/app/core/lib/assessmentParticipation';
import { canCreateCurriculumWork, resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import { ASSESSMENT_TYPE_OPTIONS, AssessmentParticipationMode } from '@/app/core/types/assessment';
import { resolveReportError } from '@/app/core/errors';
import type { AcademicPolicyBrief } from '@/app/core/types/policyGuidance';
import { useAuth } from '@/app/context/AuthContext';

const EVALUATION_TYPES = [
    { value: 'NUMERIC', label: 'Numeric (Marks-based)' },
    { value: 'RUBRIC', label: 'Rubric (Level-based)' },
    { value: 'DESCRIPTIVE', label: 'Descriptive' },
    { value: 'COMPETENCY', label: 'Competency' },
];

const ALL_COMPONENTS_CREATED_MESSAGE = 'All official assessment components have already been created for this subject and term. Edit an existing assessment or create practice work.';

function parsePositiveId(value: string | null): number | null {
    const parsed = Number(value ?? '');
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
    const searchParams = useSearchParams();
    const { activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const { curricula } = useCurricula();
    const isTeachingActor = instructorAccess.isTeachingActor;
    const isAdminLike = activeRole === 'ADMIN';
    const [policyGuidance, setPolicyGuidance] = useState<AcademicPolicyBrief | null>(null);
    const [policyGuidanceLoading, setPolicyGuidanceLoading] = useState(false);
    const [policyGuidanceError, setPolicyGuidanceError] = useState<string | null>(null);

    const assignedSubjectOptions = useMemo<InstructorSubjectOption[]>(() => {
        const options = instructorAccess.assignments
            .filter((assignment) => (
                typeof assignment.cohort_subject_id === 'number'
                && assignment.subject_offering_status !== 'DROPPED_HISTORICAL'
            ))
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
        enforceAssignedSubject: isTeachingActor,
    });

    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const { subjects } = useCohortSubjects(selectedCohortId || undefined);
    const { rubricScales } = useRubricScales();
    const saveErrorRef = useScrollIntoViewOnMessage(saveError);
    const requestedCohortId = useMemo(
        () => parsePositiveId(searchParams.get('cohort')),
        [searchParams]
    );
    const requestedCohortSubjectId = useMemo(
        () => parsePositiveId(searchParams.get('cohort_subject')),
        [searchParams]
    );
    const requestedTermId = useMemo(
        () => parsePositiveId(searchParams.get('term')),
        [searchParams]
    );
    const safeReturnTo = useMemo(() => {
        const value = searchParams.get('returnTo');
        return parseAppDestination(value);
    }, [searchParams]);
    const policySetupHref = useMemo(() => {
        const returnTo = `/assessments/new?${new URLSearchParams({
            ...(form.term ? { term: String(form.term) } : {}),
            ...(form.cohort_subject ? { cohort_subject: String(form.cohort_subject) } : {}),
            ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
        }).toString()}`;
        return `/reports/policies/cbc?returnTo=${encodeURIComponent(returnTo)}`;
    }, [form.cohort_subject, form.term, safeReturnTo]);
    const policyTermName = typeof policyGuidance?.term === 'string'
        ? policyGuidance.term
        : policyGuidance?.term?.name ?? null;

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
        if (isTeachingActor) {
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
    }, [assignedCohorts, cohorts, curricula, isTeachingActor]);

    const availableSubjects = useMemo(() => {
        if (isTeachingActor) {
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
    }, [isTeachingActor, selectedCohortId, subjects, writableAssignedSubjectOptions]);

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
    const isCbcPolicyContext = selectedCurriculum?.curriculum_type === 'CBE' || selectedCurriculum?.curriculum_type === 'CBC';
    const allowedAssessmentTypes = useMemo(
        () => policyGuidance?.allowed_assessment_types ?? [],
        [policyGuidance],
    );
    const availableAssessmentComponents = useMemo(
        () => policyGuidance?.available_assessment_components ?? [],
        [policyGuidance],
    );
    const policyDisabledReason = policyGuidance?.disabled_reason ?? policyGuidance?.blocked_reason ?? null;
    const policyUserMessage = policyGuidance?.user_message ?? policyGuidance?.message ?? null;
    const policyReady = policyGuidance?.policy_ready !== false && !policyDisabledReason;
    const cbcComponentsExhausted = Boolean(
        isCbcPolicyContext
        && form.term
        && form.cohort_subject
        && policyGuidance
        && (
            policyDisabledReason === 'all_components_created'
            || (policyReady && availableAssessmentComponents.length === 0)
        )
    );
    const assessmentTypeOptions = useMemo(() => {
        if (isCbcPolicyContext && policyGuidance) {
            return availableAssessmentComponents.map((component) => ({
                value: component.component_key,
                label: component.label,
            }));
        }
        if (!allowedAssessmentTypes.length) {
            return ASSESSMENT_TYPE_OPTIONS;
        }

        const allowed = new Set(allowedAssessmentTypes.map((type) => type.toUpperCase()));
        return ASSESSMENT_TYPE_OPTIONS.filter((option) => allowed.has(String(option.value).toUpperCase()));
    }, [allowedAssessmentTypes, availableAssessmentComponents, isCbcPolicyContext, policyGuidance]);
    const unsupportedAssessmentType = Boolean(
        !isCbcPolicyContext
        && allowedAssessmentTypes.length
        && form.assessment_type
        && !allowedAssessmentTypes
            .map((type) => type.toUpperCase())
            .includes(form.assessment_type.toUpperCase()),
    );

    const selectedPolicyComponent = useMemo(() => (
        availableAssessmentComponents.find((component) => component.component_key === form.report_component_key) ?? null
    ), [availableAssessmentComponents, form.report_component_key]);

    const selectPolicyComponent = (componentKey: string) => {
        const component = availableAssessmentComponents.find((entry) => entry.component_key === componentKey);
        if (!component) return;
        setField('report_component_key', component.component_key);
        setField('assessment_type', component.assessment_type);
        if (!form.name.trim()) {
            setField('name', component.default_name || component.label);
        }
    };

    useEffect(() => {
        if (!isCbcPolicyContext || !form.term || !form.cohort_subject) {
            setPolicyGuidance(null);
            setPolicyGuidanceError(null);
            setPolicyGuidanceLoading(false);
            return;
        }

        let cancelled = false;
        setPolicyGuidanceLoading(true);
        setPolicyGuidanceError(null);

        assessmentAPI.getPolicyGuidance({
            term: form.term,
            cohort_subject: form.cohort_subject,
        }).then((guidance) => {
            if (cancelled) return;
            setPolicyGuidance(guidance);
            const disabledReason = guidance.disabled_reason ?? guidance.blocked_reason ?? null;
            if ((guidance.policy_ready === false || disabledReason) && disabledReason !== 'all_components_created') {
                setPolicyGuidanceError(
                    isTeachingActor
                        ? guidance.user_message ?? 'Official assessment creation is blocked because your school has not completed report policy setup for this subject and term. Contact your academic admin.'
                        : guidance.user_message ?? guidance.message ?? 'No effective report policy exists for this subject and term.',
                );
                return;
            }
            const selectedStillAvailable = guidance.available_assessment_components?.some(
                (component) => component.component_key === form.report_component_key,
            );
            const nextComponent = guidance.available_assessment_components?.length === 1
                ? guidance.available_assessment_components[0]
                : null;
            if (nextComponent && (!form.report_component_key || !selectedStillAvailable)) {
                setField('report_component_key', nextComponent.component_key);
                setField('assessment_type', nextComponent.assessment_type);
                if (!form.name.trim()) {
                    setField('name', nextComponent.default_name || nextComponent.label);
                }
            } else if (!selectedStillAvailable) {
                setField('report_component_key', null);
            }
        }).catch((error) => {
            if (cancelled) return;
            const resolved = resolveReportError(error, {
                action: 'load',
                entityLabel: 'assessment policy guidance',
                role: isTeachingActor ? 'INSTRUCTOR' : 'ADMIN',
            });
            setPolicyGuidance(null);
            setPolicyGuidanceError(
                resolved.serverCode === 'policy_required'
                    ? (
                        isTeachingActor
                            ? 'Assessment creation is unavailable for this term because your school has not completed report policy setup for this subject. Contact your academic admin.'
                            : 'No effective report policy exists for this subject and term.'
                    )
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
        form.cohort_subject,
        form.name,
        form.report_component_key,
        form.term,
        isCbcPolicyContext,
        isTeachingActor,
        setField,
    ]);

    const submitDisabledReason = useMemo(() => {
        if (saving) return null;
        if (!isAdminLike && !isTeachingActor) return 'You do not have permission to create assessments.';
        if (!isSelectedCurriculumWritable) return 'This curriculum is blocked for new work.';
        if (isCbcPolicyContext && !form.term) return 'Select a term before creating an official assessment.';
        if (isCbcPolicyContext && form.term && form.cohort_subject && policyGuidanceLoading) {
            return 'Loading active policy guidance.';
        }
        if (isCbcPolicyContext && form.term && form.cohort_subject && policyGuidanceError) {
            return policyGuidanceError;
        }
        if (isCbcPolicyContext && form.term && form.cohort_subject && policyDisabledReason === 'all_components_created') {
            return ALL_COMPONENTS_CREATED_MESSAGE;
        }
        if (isCbcPolicyContext && form.term && form.cohort_subject && !policyReady) {
            return policyUserMessage ?? 'Official assessment creation is blocked by report policy setup.';
        }
        if (isCbcPolicyContext && form.term && form.cohort_subject && cbcComponentsExhausted) {
            return ALL_COMPONENTS_CREATED_MESSAGE;
        }
        if (unsupportedAssessmentType) return `This term policy allows ${allowedAssessmentTypes.join(', ')} only.`;
        return null;
    }, [
        allowedAssessmentTypes,
        cbcComponentsExhausted,
        form.cohort_subject,
        form.term,
        isAdminLike,
        isCbcPolicyContext,
        isSelectedCurriculumWritable,
        isTeachingActor,
        policyDisabledReason,
        policyGuidanceError,
        policyGuidanceLoading,
        policyReady,
        policyUserMessage,
        saving,
        unsupportedAssessmentType,
    ]);

    useEffect(() => {
        if (!isTeachingActor) return;
        if (
            requestedCohortSubjectId
            && allowedCohortSubjectIds.includes(requestedCohortSubjectId)
        ) {
            const requestedOption = assignedSubjectOptions.find(
                (option) => option.id === requestedCohortSubjectId
            );
            if (requestedOption && selectedCohortId !== requestedOption.cohort_id) {
                selectCohort(requestedOption.cohort_id);
            }
            if (form.cohort_subject !== requestedCohortSubjectId) {
                setField('cohort_subject', requestedCohortSubjectId);
            }
            return;
        }
        if (
            requestedCohortId
            && assignedCohorts.some((cohort) => cohort.id === requestedCohortId)
            && selectedCohortId !== requestedCohortId
        ) {
            selectCohort(requestedCohortId);
        }
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
    }, [
        allowedCohortSubjectIds,
        assignedCohorts,
        assignedSubjectOptions,
        form.cohort_subject,
        isTeachingActor,
        requestedCohortId,
        requestedCohortSubjectId,
        selectedCohortId,
    ]);

    useEffect(() => {
        if (requestedTermId && form.term !== requestedTermId) {
            setField('term', requestedTermId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedTermId, form.term]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSelectedCurriculumWritable) {
            return;
        }
        if (isCbcPolicyContext && form.term && form.cohort_subject && (policyGuidanceError || policyGuidanceLoading)) {
            return;
        }
        if (unsupportedAssessmentType) {
            return;
        }
        if (isCbcPolicyContext && form.term && form.cohort_subject && (!policyReady || cbcComponentsExhausted)) {
            return;
        }
        if (isCbcPolicyContext && !form.term) {
            return;
        }
        const result = await submit();
        if (!result) {
            return;
        }
        const nextSection = tracksAssessmentParticipation(form.participation_mode)
            ? '?section=participation'
            : '';
        const detailSearchParams = new URLSearchParams();
        if (nextSection) {
            detailSearchParams.set('section', 'participation');
        }
        if (safeReturnTo) {
            detailSearchParams.set('returnTo', safeReturnTo);
        }
        const query = detailSearchParams.toString();
        router.push(`/assessments/${result.id}${query ? `?${query}` : ''}`);
    };

    if (isTeachingActor && !instructorAccess.hasAssignedCohortSubjects) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={safeReturnTo ?? '/assessments'}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {safeReturnTo ? 'Back' : 'Back to Assessments'}
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

    if ((isTeachingActor ? assignedSubjectOptions.length > 0 : cohorts.length > 0) && availableCohorts.length === 0) {
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
                <Link href={safeReturnTo ?? '/assessments'}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {safeReturnTo ? 'Back' : 'Back to Assessments'}
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
                    role={isTeachingActor ? 'INSTRUCTOR' : 'ADMIN'}
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
                                    disabled={isTeachingActor && assignedCohorts.length === 1}
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
                                    disabled={!selectedCohortId || !isSelectedCurriculumWritable || (isTeachingActor && writableAssignedSubjectOptions.length === 1)}
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
                                label={isCbcPolicyContext ? 'Assessment Component' : 'Assessment Type'}
                                value={
                                    isCbcPolicyContext
                                        ? (form.report_component_key ?? '')
                                        : (unsupportedAssessmentType ? '' : form.assessment_type)
                                }
                                onChange={e => (
                                    isCbcPolicyContext
                                        ? selectPolicyComponent(e.target.value)
                                        : setField('assessment_type', e.target.value)
                                )}
                                required
                                disabled={
                                    policyGuidanceLoading
                                    || Boolean(policyGuidanceError)
                                    || cbcComponentsExhausted
                                }
                                options={[
                                    ...(isCbcPolicyContext
                                        ? [{ value: '', label: 'Select policy component', disabled: true }]
                                        : allowedAssessmentTypes.length
                                            ? [{ value: '', label: 'Select policy allowed type', disabled: true }]
                                            : []),
                                    ...assessmentTypeOptions,
                                ]}
                            />
                            {selectedPolicyComponent ? (
                                <p className="text-xs text-gray-500">
                                    Official component type: {selectedPolicyComponent.assessment_type}.
                                </p>
                            ) : null}
                            {isCbcPolicyContext && availableAssessmentComponents.length === 1 && !cbcComponentsExhausted ? (
                                <p className="text-sm text-green-700">
                                    Next official component: {availableAssessmentComponents[0].label}.
                                </p>
                            ) : null}
                            {isCbcPolicyContext && (policyGuidanceError || cbcComponentsExhausted) ? (
                                <div className="md:col-span-2">
                                    <ActionStateBanner
                                        variant={policyGuidanceError ? 'error' : 'blocked'}
                                        compact
                                        title={policyGuidanceError ? 'Policy guidance unavailable' : 'No official components remain'}
                                        message={policyGuidanceError ?? ALL_COMPONENTS_CREATED_MESSAGE}
                                    />
                                </div>
                            ) : null}
                            {unsupportedAssessmentType ? (
                                <p className="text-sm text-red-600">
                                    This term policy allows {allowedAssessmentTypes.join(', ')} only.
                                </p>
                            ) : null}

                            <div>
                                <Select
                                    label={isCbcPolicyContext ? 'Term' : 'Term (Optional)'}
                                    value={form.term?.toString() ?? ''}
                                    onChange={e => setField('term', e.target.value ? Number(e.target.value) : null)}
                                    disabled={!form.cohort_subject}
                                    options={[
                                        {
                                            value: '',
                                            label: isCbcPolicyContext ? 'Select Term' : 'No Term (Year-round)',
                                            disabled: isCbcPolicyContext,
                                        },
                                        ...terms.map((term) => ({
                                            value: String(term.id),
                                            label: `${term.academic_year_name} — ${term.name}`,
                                        })),
                                    ]}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {isCbcPolicyContext
                                        ? 'Required for official CBC assessment.'
                                        : 'Optional for year-round assessment flows.'}
                                </p>
                            </div>

                            {isCbcPolicyContext && form.term && form.cohort_subject ? (
                                <div className="md:col-span-2">
                                    {policyGuidanceError ? (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                            <p className="font-medium">
                                                {policyGuidanceError}
                                            </p>
                                            {isAdminLike ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Link href={policySetupHref}>
                                                        <Button type="button" variant="secondary" size="sm">Open policy setup</Button>
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : policyGuidance ? (
                                        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                                            <p className="font-medium">
                                                {policyUserMessage
                                                    ?? `This term uses ${policyGuidance.policy_name ?? 'the active report policy'}${policyTermName ? ` for ${policyTermName}` : ''}.`}
                                            </p>
                                            <p className="mt-1">
                                                Allowed this term: {(policyGuidance.allowed_assessment_types ?? []).join(', ') || 'None'}
                                            </p>
                                            <p>
                                                Required: {(policyGuidance.required_components ?? []).join(', ') || 'None'}
                                            </p>
                                            <p>
                                                Assignments: {policyGuidance.assignment_inclusion === 'practice_only' ? 'practice only' : 'count in reports'}
                                            </p>
                                            {cbcComponentsExhausted ? (
                                                <p className="mt-2 font-medium text-amber-800">
                                                    {ALL_COMPONENTS_CREATED_MESSAGE}
                                                </p>
                                            ) : null}
                                            {availableAssessmentComponents.length === 1 && !cbcComponentsExhausted ? (
                                                <p className="mt-2 font-medium text-green-900">
                                                    Next official component: {availableAssessmentComponents[0].label}.
                                                </p>
                                            ) : null}
                                            {policyGuidance.possible_next_steps?.length ? (
                                                <ul className="mt-2 list-disc space-y-1 pl-5 text-green-700">
                                                    {policyGuidance.possible_next_steps.map((step) => (
                                                        <li key={step}>{step}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                            {policyGuidance.updated_by || policyGuidance.last_updated ? (
                                                <p className="mt-1 text-xs text-green-700">
                                                    Updated by {policyGuidance.updated_by ?? 'admin'}{policyGuidance.last_updated ? ` on ${new Date(policyGuidance.last_updated).toLocaleDateString()}` : ''}.
                                                </p>
                                            ) : null}
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
                                value={form.assessment_date}
                                onChange={e => setField('assessment_date', e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">Who Sat</h2>
                        </div>
                        <fieldset className="space-y-3">
                            <legend className="text-sm font-medium text-gray-700">
                                Track who sat for this assessment?
                            </legend>
                            <div className="grid gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setField('participation_mode', AssessmentParticipationMode.NONE)}
                                    className={[
                                        'rounded-lg border px-4 py-4 text-left transition-colors',
                                        form.participation_mode === AssessmentParticipationMode.NONE
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300',
                                    ].join(' ')}
                                >
                                    <p className="text-sm font-medium text-gray-900">No, just enter scores</p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Use the normal grading list from active learners.
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setField('participation_mode', AssessmentParticipationMode.TRACKED)}
                                    className={[
                                        'rounded-lg border px-4 py-4 text-left transition-colors',
                                        form.participation_mode === AssessmentParticipationMode.TRACKED
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300',
                                    ].join(' ')}
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckSquare className="h-4 w-4 text-gray-500" />
                                        <p className="text-sm font-medium text-gray-900">Yes, mark who sat before grading</p>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Teachers mark sat or missed, then only ready learners enter grading.
                                    </p>
                                </button>
                            </div>
                        </fieldset>
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
                    <ActionStateBanner
                        ref={saveErrorRef}
                        variant="error"
                        title="Assessment not created"
                        message={saveError}
                        onDismiss={dismissError}
                    />
                ) : null}

                {submitDisabledReason ? (
                    <ActionStateBanner
                        variant={cbcComponentsExhausted ? 'blocked' : 'warning'}
                        compact
                        message={submitDisabledReason}
                    />
                ) : null}

                <div className="flex items-center justify-end gap-4">
                    <Link href={safeReturnTo ?? '/assessments'}>
                        <Button type="button" variant="ghost">Cancel</Button>
                    </Link>
                    <Button
                        type="submit"
                        disabled={saving || Boolean(submitDisabledReason)}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Creating…' : 'Create Assessment'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

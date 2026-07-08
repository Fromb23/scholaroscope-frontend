'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { FormValidationSummary } from '@/app/components/ui/forms';
import Modal from '@/app/components/ui/Modal';
import {
    GuidedPolicySetup,
    PolicyHierarchyGuide,
    PolicyScopeMeaningGuide,
} from '@/app/core/components/reports/PolicyGuidance';
import {
    getFormFieldErrorMessage,
    hasFormFieldErrors,
    useFormValidationFeedback,
    type FormFieldErrors,
} from '@/app/core/forms';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';
import { extractFieldErrors, fieldErrorsToSummary } from '@/app/core/errors/fieldErrors';
import {
    CBC_DEFAULT_LEVEL_SCALE,
    CBC_ENTRY_MIDTERM_PRESET,
} from '@/app/plugins/cbc/lib/reportPolicyDefaults';
import {
    CbcAssessmentWeightsEditor,
    type CbcAssessmentWeightDraft,
} from '@/app/plugins/cbc/components/reportPolicies/CbcAssessmentWeightsEditor';
import {
    CbcLevelScaleEditor,
    type CbcLevelScaleDraft,
} from '@/app/plugins/cbc/components/reportPolicies/CbcLevelScaleEditor';
import {
    CbcPolicyPresetButtons,
    type CbcPolicyPreset,
} from '@/app/plugins/cbc/components/reportPolicies/CbcPolicyPresetButtons';
import { CbcPolicySupportFields } from '@/app/plugins/cbc/components/reportPolicies/CbcPolicySupportFields';
import type {
    CbcClassReportPolicyScope,
    CbcPolicyLevelCode,
    CbcReportPolicy,
    CbcReportPolicyPayload,
    PolicyAuthoringMode,
} from '@/app/plugins/cbc/types/reportPolicy';
import { cbcReportPolicyAPI } from '@/app/plugins/cbc/api/reportPolicies';

const ROUNDING_OPTIONS = [
    { value: 'ROUND_HALF_UP', label: 'Round Half Up' },
    { value: 'ROUND_DOWN', label: 'Round Down' },
    { value: 'ROUND_UP', label: 'Round Up' },
] as const;

const CLASS_POLICY_SCOPE_OPTIONS: Array<{ value: CbcClassReportPolicyScope; label: string }> = [
    { value: 'COHORT_SUBJECT', label: 'Class subject policy' },
    { value: 'COHORT', label: 'Class policy' },
    { value: 'WORKSPACE_DEFAULT', label: 'Workspace default' },
];

interface CbcSubjectProfileOption {
    id: number;
    label: string;
}

interface CbcCohortSubjectOption {
    id: number;
    label: string;
    cohortId?: number | null;
    cohortSubjectId?: number | null;
    subjectProfileId?: number | null;
}

interface CbcCohortOption {
    id: number;
    label: string;
}

interface CbcTermOption {
    id: number;
    label: string;
}

type ReportPolicyFormField =
    | 'name'
    | 'subject_profile'
    | 'cohort'
    | 'cbc_cohort_subject'
    | 'term'
    | 'scope'
    | 'assessment_weights'
    | 'level_scale';

type FormErrors = FormFieldErrors<ReportPolicyFormField>;

const REPORT_POLICY_FIELD_ORDER: ReportPolicyFormField[] = [
    'name',
    'subject_profile',
    'scope',
    'cohort',
    'cbc_cohort_subject',
    'term',
    'assessment_weights',
    'level_scale',
];

const REPORT_POLICY_FIELD_LABELS: Record<ReportPolicyFormField, string> = {
    name: 'Policy name',
    subject_profile: 'Catalog fallback subject profile',
    cohort: 'Class',
    cbc_cohort_subject: 'Class subject',
    term: 'Term',
    scope: 'Policy scope',
    assessment_weights: 'Assessment weights',
    level_scale: 'CBC level scale',
};

export interface CbcPolicyFormState {
    name: string;
    description: string;
    policy_scope: CbcClassReportPolicyScope;
    subject_profile: number | null;
    cohort: number | null;
    cbc_cohort_subject: number | null;
    term: number | null;
    assessment_weights: CbcAssessmentWeightDraft[];
    level_scale: CbcLevelScaleDraft[];
    diagnostic_assessment_types: string[];
    required_components: string[];
    include_assignments: boolean;
    include_projects: boolean;
    include_practicals: boolean;
    rounding_mode: 'ROUND_HALF_UP' | 'ROUND_DOWN' | 'ROUND_UP';
    is_default: boolean;
    is_active: boolean;
}

interface CbcReportPolicyFormModalProps {
    editingPolicy: CbcReportPolicy | null;
    defaultPolicy?: CbcReportPolicy | null;
    templatePolicy?: CbcReportPolicy | null;
    authoringMode?: PolicyAuthoringMode;
    lockedCohortId?: number | null;
    lockedCohortSubjectId?: number | null;
    lockedCohortSubjectLabel?: string | null;
    subjectProfiles: CbcSubjectProfileOption[];
    cohorts?: CbcCohortOption[];
    cohortSubjects: CbcCohortSubjectOption[];
    terms: CbcTermOption[];
    onSuccess: (policy: CbcReportPolicy) => void;
    onClose: () => void;
}

function defaultCodeForLevel(level: string): CbcPolicyLevelCode {
    switch (level) {
        case 'ME':
            return 'ME1';
        case 'AE':
            return 'AE1';
        case 'BE':
            return 'BE1';
        case 'EE':
        default:
            return 'EE1';
    }
}

function getPolicyScopeFromForm(form: Pick<CbcPolicyFormState, 'is_default' | 'cbc_cohort_subject'>): CbcClassReportPolicyScope {
    if (form.is_default) {
        return 'WORKSPACE_DEFAULT';
    }
    if (form.cbc_cohort_subject) {
        return 'COHORT_SUBJECT';
    }
    return 'COHORT';
}

function buildEmptyForm(): CbcPolicyFormState {
    return {
        name: '',
        description: '',
        policy_scope: 'COHORT',
        subject_profile: null,
        cohort: null,
        cbc_cohort_subject: null,
        term: null,
        assessment_weights: Object.entries(CBC_ENTRY_MIDTERM_PRESET.assessment_weights).map(([type, weight]) => ({
            type,
            weight: String(weight),
        })),
        level_scale: CBC_DEFAULT_LEVEL_SCALE.map((row) => ({
            min: String(row.min),
            max: String(row.max),
            level: row.level,
            code: row.code,
            label: row.label,
            points: String(row.points),
        })),
        diagnostic_assessment_types: [...CBC_ENTRY_MIDTERM_PRESET.diagnostic_assessment_types],
        required_components: [...CBC_ENTRY_MIDTERM_PRESET.required_components],
        include_assignments: false,
        include_projects: false,
        include_practicals: false,
        rounding_mode: 'ROUND_HALF_UP',
        is_default: false,
        is_active: true,
    };
}

function payloadToForm(policy?: CbcReportPolicy | null): CbcPolicyFormState {
    if (!policy) {
        return buildEmptyForm();
    }

    return {
        name: policy.name,
        description: policy.description ?? '',
        policy_scope: getPolicyScopeFromForm(policy),
        subject_profile: policy.subject_profile,
        cohort: policy.cohort,
        cbc_cohort_subject: policy.cbc_cohort_subject,
        term: policy.term,
        assessment_weights: Object.entries(policy.assessment_weights).map(([type, weight]) => ({
            type,
            weight: String(weight),
        })),
        level_scale: policy.level_scale.map((row) => ({
            min: String(row.min),
            max: String(row.max),
            level: row.level,
            code: row.code,
            label: row.label,
            points: String(row.points),
        })),
        diagnostic_assessment_types: policy.diagnostic_assessment_types ?? [],
        required_components: policy.required_components ?? [],
        include_assignments: policy.include_assignments,
        include_projects: policy.include_projects,
        include_practicals: policy.include_practicals,
        rounding_mode: policy.rounding_mode,
        is_default: policy.is_default,
        is_active: policy.is_active,
    };
}

function isClassAuthoringMode(mode: PolicyAuthoringMode): boolean {
    return mode !== 'INSTITUTION_GOVERNANCE';
}

export function buildCbcReportPolicyPayload(
    form: CbcPolicyFormState,
    authoringMode: PolicyAuthoringMode,
    editingPolicy?: CbcReportPolicy | null,
): CbcReportPolicyPayload {
    const classMode = isClassAuthoringMode(authoringMode);
    const payload: CbcReportPolicyPayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        source: classMode ? 'class_configuration' : 'institution_governance',
        term: form.term,
        assessment_weights: Object.fromEntries(
            form.assessment_weights.map((entry) => [entry.type, Number(entry.weight) || 0]),
        ),
        level_scale: form.level_scale.map((row) => ({
            min: Number(row.min),
            max: Number(row.max),
            level: row.level,
            code: row.code,
            label: row.label.trim(),
            points: Number(row.points),
        })),
        diagnostic_assessment_types: [...form.diagnostic_assessment_types],
        required_components: [...form.required_components],
        late_enrolment: {
            pre_enrolment_component_handling: 'EXEMPT',
            allow_provisional_assessment_indicator: true,
            award_final_point_only_when_evidence_sufficient: true,
            minimum_mapped_outcomes_for_final_result: null,
            minimum_essential_outcome_coverage_percent: null,
            minimum_independent_evidence_events: null,
            allow_single_broad_evidence_event: false,
            allow_teacher_override: true,
            teacher_override_requires_reason: true,
            ...(editingPolicy?.late_enrolment ?? {}),
        },
        include_assignments: form.include_assignments,
        include_projects: form.include_projects,
        include_practicals: form.include_practicals,
        rounding_mode: form.rounding_mode,
        is_active: form.is_active,
    };

    if (!classMode) {
        payload.subject_profile = form.subject_profile;
        payload.cohort = form.cohort;
        payload.cbc_cohort_subject = form.cbc_cohort_subject;
        payload.is_default = form.is_default;
        return payload;
    }

    if (form.policy_scope === 'WORKSPACE_DEFAULT') {
        payload.is_default = true;
        if (editingPolicy) {
            payload.cohort = null;
            payload.cbc_cohort_subject = null;
        }
        return payload;
    }

    payload.is_default = false;
    payload.cohort = form.cohort;

    if (form.policy_scope === 'COHORT_SUBJECT') {
        payload.cbc_cohort_subject = form.cbc_cohort_subject;
    } else if (editingPolicy) {
        payload.cbc_cohort_subject = null;
    }

    return payload;
}

function applyAuthoringContext(
    state: CbcPolicyFormState,
    params: {
        authoringMode: PolicyAuthoringMode;
        lockedCohortId?: number | null;
        lockedCohortSubjectId?: number | null;
        isEditing?: boolean;
    },
): CbcPolicyFormState {
    const isEditing = params.isEditing ?? false;

    if (params.authoringMode === 'CLASS_SUBJECT_SETUP') {
        const policyScope = isEditing ? state.policy_scope : 'COHORT_SUBJECT';
        const subjectScoped = policyScope === 'COHORT_SUBJECT';
        const workspaceDefault = policyScope === 'WORKSPACE_DEFAULT';
        return {
            ...state,
            subject_profile: null,
            policy_scope: policyScope,
            cohort: workspaceDefault ? null : (params.lockedCohortId ?? state.cohort),
            cbc_cohort_subject: subjectScoped
                ? (state.cbc_cohort_subject ?? params.lockedCohortSubjectId ?? null)
                : null,
            is_default: workspaceDefault,
        };
    }

    if (params.authoringMode === 'CLASS_SETUP') {
        const policyScope = isEditing ? state.policy_scope : 'COHORT';
        const workspaceDefault = policyScope === 'WORKSPACE_DEFAULT';
        return {
            ...state,
            subject_profile: null,
            policy_scope: policyScope,
            cohort: workspaceDefault ? null : (state.cohort ?? params.lockedCohortId ?? null),
            cbc_cohort_subject: policyScope === 'COHORT_SUBJECT' ? state.cbc_cohort_subject : null,
            is_default: workspaceDefault,
        };
    }

    if (params.authoringMode === 'WORKSPACE_POLICY') {
        return {
            ...state,
            subject_profile: null,
            policy_scope: 'WORKSPACE_DEFAULT',
            cohort: null,
            cbc_cohort_subject: null,
            is_default: true,
        };
    }

    return state;
}

function templateToForm(policy?: CbcReportPolicy | null): CbcPolicyFormState {
    if (!policy) {
        return {
            ...buildEmptyForm(),
        };
    }

    return {
        ...buildEmptyForm(),
        assessment_weights: Object.entries(policy.assessment_weights).map(([type, weight]) => ({
            type,
            weight: String(weight),
        })),
        level_scale: policy.level_scale.map((row) => ({
            min: String(row.min),
            max: String(row.max),
            level: row.level,
            code: row.code,
            label: row.label,
            points: String(row.points),
        })),
        diagnostic_assessment_types: policy.diagnostic_assessment_types ?? [],
        required_components: policy.required_components ?? [],
        include_assignments: policy.include_assignments,
        include_projects: policy.include_projects,
        include_practicals: policy.include_practicals,
        rounding_mode: policy.rounding_mode,
        is_active: true,
    };
}

function copyPolicyToForm(policy: CbcReportPolicy): CbcPolicyFormState {
    return {
        ...payloadToForm(policy),
        name: `${policy.name} active copy`,
        is_active: true,
    };
}

type ReportPolicyInvalidTarget =
    | 'name'
    | 'subject_profile'
    | 'scope'
    | 'term'
    | 'assessment_weights'
    | 'level_scale';

interface MappedReportPolicyErrors {
    fieldErrors: FormErrors;
    globalError: string | null;
    firstTarget: ReportPolicyInvalidTarget | null;
}

function messagesForField(fieldErrors: Record<string, string[]>, field: string): string | null {
    const message = fieldErrors[field]?.filter(Boolean).join('\n');
    return message || null;
}

function readNonFieldError(error: ApiError): string | null {
    const data = error.response?.data;

    if (!data) {
        return null;
    }
    if (typeof data === 'string') {
        return data;
    }
    if (Array.isArray(data)) {
        return data.filter((entry): entry is string => typeof entry === 'string').join('\n') || null;
    }
    if (typeof data !== 'object') {
        return null;
    }

    const nonField = 'non_field_errors' in data ? data.non_field_errors : null;
    if (Array.isArray(nonField)) {
        return nonField.filter((entry): entry is string => typeof entry === 'string').join('\n') || null;
    }
    if (typeof nonField === 'string') {
        return nonField;
    }
    if ('detail' in data && typeof data.detail === 'string') {
        return data.detail;
    }
    if ('message' in data && typeof data.message === 'string') {
        return data.message;
    }

    return null;
}

function getFirstReportPolicyInvalidTarget(errors: FormErrors): ReportPolicyInvalidTarget | null {
    if (errors.name) return 'name';
    if (errors.subject_profile) return 'subject_profile';
    if (errors.scope || errors.cohort || errors.cbc_cohort_subject) return 'scope';
    if (errors.term) return 'term';
    if (errors.assessment_weights) return 'assessment_weights';
    if (errors.level_scale) return 'level_scale';
    return null;
}

export function mapCbcReportPolicyApiErrors(
    error: ApiError,
    authoringMode: PolicyAuthoringMode,
): MappedReportPolicyErrors {
    const fieldErrors = extractFieldErrors(error.response?.data);
    const classMode = isClassAuthoringMode(authoringMode);
    const mapped: FormErrors = {};

    const name = messagesForField(fieldErrors, 'name');
    if (name) mapped.name = name;

    const assessmentWeights = messagesForField(fieldErrors, 'assessment_weights');
    if (assessmentWeights) mapped.assessment_weights = assessmentWeights;

    const levelScale = messagesForField(fieldErrors, 'level_scale');
    if (levelScale) mapped.level_scale = levelScale;

    const term = messagesForField(fieldErrors, 'term');
    if (term) mapped.term = term;

    const subjectProfile = messagesForField(fieldErrors, 'subject_profile');
    if (subjectProfile) {
        if (classMode) {
            mapped.scope = 'Choose a class subject instead of a catalog subject profile.';
        } else {
            mapped.subject_profile = subjectProfile;
        }
    }

    const cohort = messagesForField(fieldErrors, 'cohort');
    if (cohort) {
        mapped.cohort = cohort;
        if (classMode) {
            mapped.scope = cohort;
        }
    }

    const cbcCohortSubject = messagesForField(fieldErrors, 'cbc_cohort_subject');
    if (cbcCohortSubject) {
        mapped.cbc_cohort_subject = cbcCohortSubject;
        if (classMode) {
            mapped.scope = cbcCohortSubject;
        }
    }

    const knownFields = new Set([
        'name',
        'assessment_weights',
        'level_scale',
        'term',
        'subject_profile',
        'cohort',
        'cbc_cohort_subject',
    ]);
    const unknownFieldErrors = Object.fromEntries(
        Object.entries(fieldErrors).filter(([field]) => !knownFields.has(field)),
    );
    const globalError = readNonFieldError(error)
        ?? (Object.keys(unknownFieldErrors).length > 0 ? fieldErrorsToSummary(unknownFieldErrors) : null);

    return {
        fieldErrors: mapped,
        globalError,
        firstTarget: getFirstReportPolicyInvalidTarget(mapped),
    };
}

export function CbcReportPolicyFormModal({
    editingPolicy,
    defaultPolicy = null,
    templatePolicy = null,
    authoringMode = 'INSTITUTION_GOVERNANCE',
    lockedCohortId = null,
    lockedCohortSubjectId = null,
    lockedCohortSubjectLabel = null,
    subjectProfiles,
    cohorts = [],
    cohortSubjects,
    terms,
    onSuccess,
    onClose,
}: CbcReportPolicyFormModalProps) {
    const initialState = useMemo(
        () => (
            applyAuthoringContext(
                editingPolicy
                    ? payloadToForm(editingPolicy)
                    : templatePolicy
                        ? copyPolicyToForm(templatePolicy)
                    : templateToForm(defaultPolicy ?? null),
                {
                    authoringMode,
                    lockedCohortId,
                    lockedCohortSubjectId,
                    isEditing: Boolean(editingPolicy),
                },
            )
        ),
        [authoringMode, defaultPolicy, editingPolicy, lockedCohortId, lockedCohortSubjectId, templatePolicy],
    );
    const [form, setForm] = useState<CbcPolicyFormState>(initialState);
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const {
        summaryRef,
        setFieldRef,
        focusField,
        focusFirstError,
    } = useFormValidationFeedback<ReportPolicyFormField>({
        fieldErrors: errors,
        fieldOrder: REPORT_POLICY_FIELD_ORDER,
        fieldLabels: REPORT_POLICY_FIELD_LABELS,
        summaryId: 'cbc-report-policy-validation-summary',
    });

    const isClassMode = isClassAuthoringMode(authoringMode);
    const selectedClassLabel = useMemo(() => {
        if (!lockedCohortId) return 'Selected class';
        return cohorts.find((cohort) => cohort.id === lockedCohortId)?.label?.trim() || 'Selected class';
    }, [cohorts, lockedCohortId]);
    const classCohortSubjectOptions = useMemo(() => {
        const options = lockedCohortId
            ? cohortSubjects.filter((subject) => subject.cohortId === lockedCohortId)
            : cohortSubjects;
        const hasSelected = form.cbc_cohort_subject
            ? options.some((subject) => subject.id === form.cbc_cohort_subject)
            : true;

        if (hasSelected || !form.cbc_cohort_subject) {
            return options;
        }

        return [
            ...options,
            {
                id: form.cbc_cohort_subject,
                label: lockedCohortSubjectLabel ?? 'Selected class subject',
                cohortId: lockedCohortId,
                cohortSubjectId: null,
                subjectProfileId: null,
            },
        ];
    }, [cohortSubjects, form.cbc_cohort_subject, lockedCohortId, lockedCohortSubjectLabel]);
    const selectedCohortSubjectLabel = useMemo(() => {
        if (!form.cbc_cohort_subject) return 'Selected class subject';
        return classCohortSubjectOptions.find((subject) => subject.id === form.cbc_cohort_subject)?.label
            ?? lockedCohortSubjectLabel
            ?? 'Selected class subject';
    }, [classCohortSubjectOptions, form.cbc_cohort_subject, lockedCohortSubjectLabel]);

    const setField = <K extends keyof CbcPolicyFormState>(field: K, value: CbcPolicyFormState[K]) => {
        setForm((previous) => ({ ...previous, [field]: value }));
        if (field in errors) {
            setErrors((previous) => {
                const next = { ...previous };
                delete next[field as keyof FormErrors];
                return next;
            });
        }
        if (['policy_scope', 'cohort', 'cbc_cohort_subject'].includes(field as string) && (errors.scope || errors.cohort || errors.cbc_cohort_subject)) {
            setErrors((previous) => {
                const next = { ...previous };
                delete next.scope;
                delete next.cohort;
                delete next.cbc_cohort_subject;
                return next;
            });
        }
    };

    const updateWeightEntry = (index: number, field: keyof CbcAssessmentWeightDraft, value: string) => {
        setField(
            'assessment_weights',
            form.assessment_weights.map((entry, currentIndex) => (
                currentIndex === index ? { ...entry, [field]: value } : entry
            )),
        );
    };

    const addWeightEntry = () => {
        setField('assessment_weights', [...form.assessment_weights, { type: 'CAT', weight: '0' }]);
    };

    const removeWeightEntry = (index: number) => {
        setField(
            'assessment_weights',
            form.assessment_weights.filter((_, currentIndex) => currentIndex !== index),
        );
    };

    const updateLevelScale = (index: number, field: keyof CbcLevelScaleDraft, value: string) => {
        setField(
            'level_scale',
            form.level_scale.map((row, currentIndex) => {
                if (currentIndex !== index) return row;

                if (field === 'level') {
                    return {
                        ...row,
                        level: value as CbcLevelScaleDraft['level'],
                        code: defaultCodeForLevel(value),
                    };
                }

                return { ...row, [field]: value };
            }),
        );
    };

    const addLevelScaleRow = () => {
        setField('level_scale', [
            ...form.level_scale,
            {
                min: '',
                max: '',
                level: 'EE',
                code: 'EE1',
                label: '',
                points: '',
            },
        ]);
    };

    const removeLevelScaleRow = (index: number) => {
        setField(
            'level_scale',
            form.level_scale.filter((_, currentIndex) => currentIndex !== index),
        );
    };

    const toggleArrayValue = (field: 'required_components' | 'diagnostic_assessment_types', value: string) => {
        const current = form[field];
        setField(
            field,
            current.includes(value)
                ? current.filter((entry) => entry !== value)
                : [...current, value],
        );
    };

    const setPolicyScope = (scope: CbcClassReportPolicyScope) => {
        setForm((previous) => {
            if (scope === 'WORKSPACE_DEFAULT') {
                return {
                    ...previous,
                    policy_scope: scope,
                    subject_profile: null,
                    cohort: null,
                    cbc_cohort_subject: null,
                    is_default: true,
                };
            }

            if (scope === 'COHORT_SUBJECT') {
                const selectedSubject = classCohortSubjectOptions.find((subject) => (
                    subject.id === previous.cbc_cohort_subject
                )) ?? classCohortSubjectOptions.find((subject) => (
                    lockedCohortSubjectId ? subject.id === lockedCohortSubjectId : false
                )) ?? classCohortSubjectOptions[0] ?? null;

                return {
                    ...previous,
                    policy_scope: scope,
                    subject_profile: null,
                    cohort: selectedSubject?.cohortId ?? lockedCohortId ?? previous.cohort,
                    cbc_cohort_subject: selectedSubject?.id ?? null,
                    is_default: false,
                };
            }

            return {
                ...previous,
                policy_scope: scope,
                subject_profile: null,
                cohort: lockedCohortId ?? previous.cohort,
                cbc_cohort_subject: null,
                is_default: false,
            };
        });
        setErrors((previous) => {
            const next = { ...previous };
            delete next.scope;
            delete next.cohort;
            delete next.cbc_cohort_subject;
            return next;
        });
    };

    const setClassSubjectScope = (selectedId: number | null) => {
        const selectedOption = classCohortSubjectOptions.find((option) => option.id === selectedId);
        setForm((previous) => ({
            ...previous,
            policy_scope: 'COHORT_SUBJECT',
            subject_profile: null,
            cohort: selectedOption?.cohortId ?? lockedCohortId ?? previous.cohort,
            cbc_cohort_subject: selectedId,
            is_default: false,
        }));
        setErrors((previous) => {
            const next = { ...previous };
            delete next.scope;
            delete next.cohort;
            delete next.cbc_cohort_subject;
            return next;
        });
    };

    const applyPolicyPreset = (preset: CbcPolicyPreset) => {
        setField(
            'assessment_weights',
            Object.entries(preset.assessmentWeights).map(([type, weight]) => ({
                type,
                weight: String(weight),
            })),
        );
        setField('required_components', [...preset.requiredComponents]);
        setField('diagnostic_assessment_types', [...preset.diagnosticAssessmentTypes]);
        if (preset.includeAssignments !== undefined) {
            setField('include_assignments', preset.includeAssignments);
        }
        if (preset.includeProjects !== undefined) {
            setField('include_projects', preset.includeProjects);
        }
        if (preset.includePracticals !== undefined) {
            setField('include_practicals', preset.includePracticals);
        }
    };

    const validateForm = (): FormErrors => {
        const nextErrors: FormErrors = {};

        if (!form.name.trim()) {
            nextErrors.name = 'Policy name is required.';
        }

        if (isClassMode) {
            if (form.policy_scope === 'COHORT' && !form.cohort) {
                nextErrors.scope = 'Choose the class this policy applies to.';
                nextErrors.cohort = nextErrors.scope;
            }
            if (form.policy_scope === 'COHORT_SUBJECT') {
                if (!form.cohort) {
                    nextErrors.scope = 'Choose the class before saving a subject policy.';
                    nextErrors.cohort = nextErrors.scope;
                } else if (!form.cbc_cohort_subject) {
                    nextErrors.scope = 'Choose the class subject this policy applies to.';
                    nextErrors.cbc_cohort_subject = nextErrors.scope;
                }
            }
        }

        const positiveWeightTotal = form.assessment_weights.reduce((sum, entry) => {
            const weight = Number(entry.weight);
            return weight > 0 ? sum + weight : sum;
        }, 0);

        const hasNegativeWeight = form.assessment_weights.some((entry) => Number(entry.weight) < 0);
        if (hasNegativeWeight || Math.abs(positiveWeightTotal - 100) > 0.01) {
            nextErrors.assessment_weights = `Positive contributing weights must total 100. Current total: ${positiveWeightTotal}.`;
        }

        const scaleRows = form.level_scale.map((row) => ({
            ...row,
            min: Number(row.min),
            max: Number(row.max),
            points: Number(row.points),
        }));

        if (!scaleRows.length) {
            nextErrors.level_scale = 'At least one CBC level scale row is required.';
        } else {
            const hasInvalidRow = scaleRows.some((row) => (
                Number.isNaN(row.min)
                || Number.isNaN(row.max)
                || Number.isNaN(row.points)
                || !row.label.trim()
                || row.max < row.min
                || row.min < 0
                || row.max > 100
                || !row.code.startsWith(row.level)
            ));

            if (hasInvalidRow) {
                nextErrors.level_scale = 'Each level row needs min, max, level, code, label, and points with valid non-overlapping 0-100 ranges.';
            } else {
                const sorted = [...scaleRows].sort((left, right) => left.min - right.min);
                for (let index = 1; index < sorted.length; index += 1) {
                    if (sorted[index].min <= sorted[index - 1].max) {
                        nextErrors.level_scale = 'CBC level scale ranges must not overlap.';
                        break;
                    }
                }
            }
        }

        return nextErrors;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        const validationErrors = validateForm();
        setErrors(validationErrors);
        if (hasFormFieldErrors(validationErrors)) {
            focusFirstError(validationErrors);
            return;
        }

        setSaving(true);
        setSaveError(null);

        try {
            const payload = buildCbcReportPolicyPayload(form, authoringMode, editingPolicy);

            const saved = editingPolicy
                ? await cbcReportPolicyAPI.update(editingPolicy.id, payload)
                : await cbcReportPolicyAPI.create(payload);

            onSuccess(saved);
        } catch (error) {
            const mappedErrors = mapCbcReportPolicyApiErrors(error as ApiError, authoringMode);
            setErrors(mappedErrors.fieldErrors);
            setSaveError(
                mappedErrors.globalError
                ?? (Object.keys(mappedErrors.fieldErrors).length > 0
                    ? null
                    : extractErrorMessage(error as ApiError, 'Failed to save CBC report policy.')),
            );
            focusFirstError(mappedErrors.fieldErrors);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={authoringMode === 'INSTITUTION_GOVERNANCE'
                ? (editingPolicy ? 'Edit CBC Report Policy' : 'New CBC Report Policy')
                : (editingPolicy ? 'Edit Report Setup' : 'New Report Setup')}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
                {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

                <div ref={summaryRef}>
                    <FormValidationSummary
                        id="cbc-report-policy-validation-summary"
                        title="Some fields need correction."
                        fieldErrors={errors}
                        fieldLabels={REPORT_POLICY_FIELD_LABELS}
                        onFieldClick={focusField}
                    />
                </div>

                <GuidedPolicySetup />
                <PolicyHierarchyGuide />

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <Input
                            ref={setFieldRef('name')}
                            label="Policy Name"
                            value={form.name}
                            onChange={(event) => setField('name', event.target.value)}
                            placeholder="e.g., Grade 7 End Term CBC Policy"
                            required
                            error={getFormFieldErrorMessage(errors.name)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Description (Optional)
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(event) => setField('description', event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Optional CBC report policy notes"
                        />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    {authoringMode === 'INSTITUTION_GOVERNANCE' ? (
                        <>
                            <Select
                                label="Class policy"
                                value={form.cohort?.toString() ?? ''}
                                onChange={(event) => setField(
                                    'cohort',
                                    event.target.value ? Number(event.target.value) : null,
                                )}
                                error={getFormFieldErrorMessage(errors.cohort)}
                                options={[
                                    { value: '', label: 'Any class' },
                                    ...cohorts.map((cohort) => ({
                                        value: String(cohort.id),
                                        label: `Class: ${cohort.label}`,
                                    })),
                                ]}
                            />
                            <Select
                                label="Class subject policy"
                                value={form.cbc_cohort_subject?.toString() ?? ''}
                                onChange={(event) => {
                                    const selectedId = event.target.value ? Number(event.target.value) : null;
                                    setField('cbc_cohort_subject', selectedId);

                                    if (!selectedId) return;

                                    const selectedOption = cohortSubjects.find((option) => option.id === selectedId);
                                    if (selectedOption?.subjectProfileId) {
                                        setField('subject_profile', selectedOption.subjectProfileId);
                                    }
                                    if (selectedOption?.cohortId) {
                                        setField('cohort', selectedOption.cohortId);
                                    }
                                }}
                                error={getFormFieldErrorMessage(errors.cbc_cohort_subject)}
                                options={[
                                    { value: '', label: 'Any class subject' },
                                    ...cohortSubjects.map((subject) => ({
                                        value: String(subject.id),
                                        label: subject.label,
                                    })),
                                ]}
                            />
                            <Select
                                ref={setFieldRef('subject_profile')}
                                label="Catalog fallback / reference"
                                value={form.subject_profile?.toString() ?? ''}
                                onChange={(event) => setField(
                                    'subject_profile',
                                    event.target.value ? Number(event.target.value) : null,
                                )}
                                error={getFormFieldErrorMessage(errors.subject_profile)}
                                options={[
                                    { value: '', label: 'No catalog fallback' },
                                    ...subjectProfiles.map((profile) => ({
                                        value: String(profile.id),
                                        label: profile.label,
                                    })),
                                ]}
                            />
                            <p className="text-xs text-gray-500 md:col-span-3">
                                Use registered class subjects for operational report policies. Catalog fallback profiles are reference only when no class subject policy can be authored.
                            </p>
                        </>
                    ) : (
                        <div
                            ref={setFieldRef('scope')}
                            tabIndex={-1}
                            className={`space-y-3 rounded-lg border px-3 py-3 md:col-span-3 ${
                                errors.scope
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-gray-200 bg-gray-50'
                            }`}
                        >
                            <Select
                                label="Policy applies to"
                                value={form.policy_scope}
                                onChange={(event) => setPolicyScope(event.target.value as CbcClassReportPolicyScope)}
                                options={CLASS_POLICY_SCOPE_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                }))}
                            />
                            {form.policy_scope === 'COHORT' ? (
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-500">Class</p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900">{selectedClassLabel}</p>
                                </div>
                            ) : null}
                            {form.policy_scope === 'COHORT_SUBJECT' ? (
                                <Select
                                    label="Class subject"
                                    value={form.cbc_cohort_subject?.toString() ?? ''}
                                    onChange={(event) => setClassSubjectScope(
                                        event.target.value ? Number(event.target.value) : null,
                                    )}
                                    error={getFormFieldErrorMessage(errors.cbc_cohort_subject)}
                                    options={[
                                        {
                                            value: '',
                                            label: classCohortSubjectOptions.length
                                                ? 'Choose class subject'
                                                : 'No class subjects available',
                                            disabled: true,
                                        },
                                        ...classCohortSubjectOptions.map((subject) => ({
                                            value: String(subject.id),
                                            label: subject.label,
                                        })),
                                    ]}
                                />
                            ) : null}
                            {form.policy_scope === 'WORKSPACE_DEFAULT' ? (
                                <p className="text-sm text-gray-700">
                                    This becomes the fallback report setup for this workspace when no class or subject policy is more specific.
                                </p>
                            ) : null}
                            {form.policy_scope === 'COHORT_SUBJECT' && form.cbc_cohort_subject ? (
                                <p className="text-xs text-gray-500">Selected subject: {selectedCohortSubjectLabel}</p>
                            ) : null}
                            {errors.scope ? (
                                <p className="text-sm font-medium text-red-700">{getFormFieldErrorMessage(errors.scope)}</p>
                            ) : null}
                        </div>
                    )}
                    <Select
                        ref={setFieldRef('term')}
                        label="Term"
                        value={form.term?.toString() ?? ''}
                        onChange={(event) => setField('term', event.target.value ? Number(event.target.value) : null)}
                        error={getFormFieldErrorMessage(errors.term)}
                        options={[
                            { value: '', label: 'Any term' },
                            ...terms.map((term) => ({
                                value: String(term.id),
                                label: term.label,
                            })),
                        ]}
                    />
                </div>

                <PolicyScopeMeaningGuide />

                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {authoringMode === 'INSTITUTION_GOVERNANCE'
                        ? 'CBC report policies are plugin-owned. Assessment pages only preview these rules and link back here for policy authoring.'
                        : 'Class configuration report setup is saved against this class workspace context.'}
                </div>

                <div ref={setFieldRef('assessment_weights')} tabIndex={-1} className="border-t border-gray-100 pt-4">
                    <CbcPolicyPresetButtons onApply={applyPolicyPreset} />
                    <CbcAssessmentWeightsEditor
                        entries={form.assessment_weights}
                        error={getFormFieldErrorMessage(errors.assessment_weights)}
                        onAdd={addWeightEntry}
                        onRemove={removeWeightEntry}
                        onChange={updateWeightEntry}
                    />
                </div>

                <CbcPolicySupportFields
                    requiredComponents={form.required_components}
                    diagnosticAssessmentTypes={form.diagnostic_assessment_types}
                    includeAssignments={form.include_assignments}
                    includeProjects={form.include_projects}
                    includePracticals={form.include_practicals}
                    onToggleArrayValue={toggleArrayValue}
                    onSetEvidenceSource={setField}
                />

                <div ref={setFieldRef('level_scale')} tabIndex={-1} className="border-t border-gray-100 pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Select
                            label="Rounding Mode"
                            value={form.rounding_mode}
                            onChange={(event) => setField('rounding_mode', event.target.value as CbcPolicyFormState['rounding_mode'])}
                            options={ROUNDING_OPTIONS.map((option) => ({
                                value: option.value,
                                label: option.label,
                            }))}
                        />
                        {authoringMode === 'INSTITUTION_GOVERNANCE' ? (
                            <label className="flex cursor-pointer items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    checked={form.is_default}
                                    onChange={(event) => setField('is_default', event.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Default policy</span>
                            </label>
                        ) : null}
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(event) => setField('is_active', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">
                                Active
                                <span className="ml-1 text-xs text-gray-500">
                                    Only active policies are used. Inactive policies are saved drafts or retired policies.
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <CbcLevelScaleEditor
                        rows={form.level_scale}
                        error={getFormFieldErrorMessage(errors.level_scale)}
                        onAdd={addLevelScaleRow}
                        onRemove={removeLevelScaleRow}
                        onChange={updateLevelScale}
                    />
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving
                            ? (editingPolicy ? 'Saving…' : 'Creating…')
                            : (editingPolicy ? 'Save Changes' : (authoringMode === 'INSTITUTION_GOVERNANCE' ? 'Create CBC Report Policy' : 'Create Report Setup'))}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

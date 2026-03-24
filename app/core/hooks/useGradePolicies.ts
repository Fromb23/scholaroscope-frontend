// app/core/hooks/useGradePolicies.ts

import { useState, useEffect } from 'react';
import { gradePolicyAPI } from '@/app/core/api/gradePolicy';
import {
    GradePolicy,
    GradePolicyPayload,
    ComputedGradeDTO,
    PolicyFilters,
    PolicyContextFilters,
    ComputedGradeFilters,
} from '@/app/core/types/gradePolicy';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

// ── useGradePolicies ──────────────────────────────────────────────────────

export function useGradePolicies(filters?: PolicyFilters) {
    const [policies, setPolicies] = useState<GradePolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            setError(null);
            setPolicies(await gradePolicyAPI.getAll(filters));
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch policies'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [
        filters?.cohort_subject,
        filters?.cohort,
        filters?.curriculum,
        filters?.term,
        filters?.is_active,
    ]);

    const createPolicy = async (payload: GradePolicyPayload): Promise<GradePolicy> => {
        const created = await gradePolicyAPI.create(payload);
        setPolicies(prev => [created, ...prev]);
        return created;
    };

    const updatePolicy = async (
        id: number,
        payload: Partial<GradePolicyPayload>
    ): Promise<GradePolicy> => {
        const updated = await gradePolicyAPI.update(id, payload);
        setPolicies(prev => prev.map(p => p.id === id ? updated : p));
        return updated;
    };

    const deletePolicy = async (id: number): Promise<void> => {
        await gradePolicyAPI.delete(id);
        setPolicies(prev => prev.filter(p => p.id !== id));
    };

    const getForContext = async (
        ctx: PolicyContextFilters
    ): Promise<GradePolicy | null> => {
        try {
            return await gradePolicyAPI.getForContext(ctx);
        } catch {
            return null;
        }
    };

    return {
        policies, loading, error,
        refetch: fetchPolicies,
        createPolicy, updatePolicy, deletePolicy, getForContext,
    };
}

// ── useCreatePolicyForm ───────────────────────────────────────────────────

export interface GradingBandDraft {
    min: string;
    max: string;
    grade: string;
    label: string;
}

export interface WeightEntry {
    type: string;
    weight: string;
}

export interface PolicyFormState {
    name: string;
    description: string;
    cohort_subject: number | null;
    cohort: number | null;
    curriculum: number | null;
    term: number | null;
    aggregation_method: string;
    weight_entries: WeightEntry[];
    required_components: string[];
    grading_scale: GradingBandDraft[];
    drop_lowest_cat: boolean;
    cap_cat_score: string;
    cap_exam_score: string;
    is_active: boolean;
    is_default: boolean;
}

interface FormErrors {
    name?: string;
    aggregation_method?: string;
    weight_entries?: string;
    grading_scale?: string;
    [key: string]: string | undefined;
}

const DEFAULT_FORM: PolicyFormState = {
    name: '',
    description: '',
    cohort_subject: null,
    cohort: null,
    curriculum: null,
    term: null,
    aggregation_method: 'WEIGHTED',
    weight_entries: [
        { type: 'CAT', weight: '40' },
        { type: 'MAIN_EXAM', weight: '60' },
    ],
    required_components: [],
    grading_scale: [
        { min: '80', max: '100', grade: 'A', label: 'Excellent' },
        { min: '60', max: '79', grade: 'B', label: 'Good' },
        { min: '50', max: '59', grade: 'C', label: 'Average' },
        { min: '40', max: '49', grade: 'D', label: 'Below Average' },
        { min: '0', max: '39', grade: 'E', label: 'Fail' },
    ],
    drop_lowest_cat: false,
    cap_cat_score: '',
    cap_exam_score: '',
    is_active: true,
    is_default: false,
};

export function useCreatePolicyForm(
    onSuccess: (policy: GradePolicy) => void,
    editingPolicy?: GradePolicy | null,
) {
    const [form, setForm] = useState<PolicyFormState>(
        editingPolicy ? policyToForm(editingPolicy) : DEFAULT_FORM
    );
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const setField = <K extends keyof PolicyFormState>(
        field: K, value: PolicyFormState[K]
    ) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (field in errors) {
            setErrors(prev => { const e = { ...prev }; delete e[field as string]; return e; });
        }
    };

    const addWeightEntry = () =>
        setField('weight_entries', [...form.weight_entries, { type: 'CAT', weight: '0' }]);

    const removeWeightEntry = (i: number) =>
        setField('weight_entries', form.weight_entries.filter((_, idx) => idx !== i));

    const updateWeightEntry = (i: number, field: keyof WeightEntry, value: string) =>
        setField('weight_entries', form.weight_entries.map((e, idx) =>
            idx === i ? { ...e, [field]: value } : e
        ));

    const addGradingBand = () =>
        setField('grading_scale', [...form.grading_scale, { min: '0', max: '0', grade: '', label: '' }]);

    const removeGradingBand = (i: number) =>
        setField('grading_scale', form.grading_scale.filter((_, idx) => idx !== i));

    const updateGradingBand = (i: number, field: keyof GradingBandDraft, value: string) =>
        setField('grading_scale', form.grading_scale.map((b, idx) =>
            idx === i ? { ...b, [field]: value } : b
        ));

    const toggleRequiredComponent = (type: string) => {
        const current = form.required_components;
        setField('required_components',
            current.includes(type)
                ? current.filter(c => c !== type)
                : [...current, type]
        );
    };

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!form.name.trim()) e.name = 'Policy name is required';
        if (!form.aggregation_method) e.aggregation_method = 'Aggregation method is required';

        if (['WEIGHTED', 'AVERAGE_PLUS_EXAM'].includes(form.aggregation_method)) {
            const total = form.weight_entries.reduce(
                (sum, e) => sum + (parseFloat(e.weight) || 0), 0
            );
            if (Math.abs(total - 100) > 0.01) {
                e.weight_entries = `Weights must sum to 100, got ${total}`;
            }
        }

        if (form.grading_scale.length > 0) {
            const mins = form.grading_scale.map(b => b.min);
            if (new Set(mins).size !== mins.length) {
                e.grading_scale = 'Grading bands must have unique min values';
            }
            for (const band of form.grading_scale) {
                if (!band.grade.trim()) {
                    e.grading_scale = 'Each grading band must have a grade';
                    break;
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (): Promise<void> => {
        if (!validate()) return;
        setSaving(true);
        setSaveError(null);

        try {
            const payload: GradePolicyPayload = {
                name: form.name,
                description: form.description || undefined,
                cohort_subject: form.cohort_subject,
                cohort: form.cohort,
                curriculum: form.curriculum,
                term: form.term,
                aggregation_method: form.aggregation_method as GradePolicyPayload['aggregation_method'],
                default_weighting: Object.fromEntries(
                    form.weight_entries.map(e => [e.type, parseFloat(e.weight) || 0])
                ),
                required_components: form.required_components,
                grading_scale: form.grading_scale.map(b => ({
                    min: parseFloat(b.min) || 0,
                    max: parseFloat(b.max) || 100,
                    grade: b.grade,
                    label: b.label || undefined,
                })),
                drop_lowest_cat: form.drop_lowest_cat,
                cap_cat_score: form.cap_cat_score ? parseFloat(form.cap_cat_score) : null,
                cap_exam_score: form.cap_exam_score ? parseFloat(form.cap_exam_score) : null,
                is_active: form.is_active,
                is_default: form.is_default,
            };

            let result: GradePolicy;
            if (editingPolicy) {
                result = await gradePolicyAPI.update(editingPolicy.id, payload);
            } else {
                result = await gradePolicyAPI.create(payload);
            }
            onSuccess(result);
        } catch (err) {
            setSaveError(extractErrorMessage(err as ApiError, 'Failed to save policy'));
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        setForm(editingPolicy ? policyToForm(editingPolicy) : DEFAULT_FORM);
        setErrors({});
        setSaveError(null);
    };

    return {
        form, errors, saving, saveError,
        setField,
        addWeightEntry, removeWeightEntry, updateWeightEntry,
        addGradingBand, removeGradingBand, updateGradingBand,
        toggleRequiredComponent,
        submit, reset,
        dismissError: () => setSaveError(null),
    };
}

// ── useComputedGrades ─────────────────────────────────────────────────────

export function useComputedGrades(filters?: ComputedGradeFilters) {
    const [grades, setGrades] = useState<ComputedGradeDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGrades = async () => {
        const hasFilter = filters && Object.values(filters).some(v => v !== undefined);
        if (!hasFilter) { setLoading(false); return; }
        try {
            setLoading(true);
            setError(null);
            setGrades(await gradePolicyAPI.getComputedGrades(filters));
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch computed grades'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGrades();
    }, [filters?.student, filters?.term, filters?.cohort_subject, filters?.policy]);

    const computeWithPolicy = async (
        termId: number, cohortId?: number, policyId?: number
    ): Promise<void> => {
        await gradePolicyAPI.computeWithPolicy({ term_id: termId, cohort_id: cohortId, policy_id: policyId });
        await fetchGrades();
    };

    return { grades, loading, error, refetch: fetchGrades, computeWithPolicy };
}

// ── Helper — convert existing policy to form state ────────────────────────

function policyToForm(policy: GradePolicy): PolicyFormState {
    return {
        name: policy.name,
        description: policy.description ?? '',
        cohort_subject: policy.cohort_subject ?? null,
        cohort: policy.cohort ?? null,
        curriculum: policy.curriculum ?? null,
        term: policy.term ?? null,
        aggregation_method: policy.aggregation_method,
        weight_entries: Object.entries(policy.default_weighting ?? {}).map(
            ([type, weight]) => ({ type, weight: String(weight) })
        ),
        required_components: policy.required_components ?? [],
        grading_scale: (policy.grading_scale ?? []).map(b => ({
            min: String(b.min),
            max: String(b.max ?? ''),
            grade: b.grade,
            label: b.label ?? '',
        })),
        drop_lowest_cat: policy.drop_lowest_cat ?? false,
        cap_cat_score: policy.cap_cat_score != null ? String(policy.cap_cat_score) : '',
        cap_exam_score: policy.cap_exam_score != null ? String(policy.cap_exam_score) : '',
        is_active: policy.is_active,
        is_default: policy.is_default,
    };
}
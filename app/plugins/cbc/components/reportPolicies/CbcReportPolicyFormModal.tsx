'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { ASSESSMENT_TYPE_OPTIONS, getAssessmentTypeLabel } from '@/app/core/types/assessment';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';
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
import type {
    CbcPolicyLevelCode,
    CbcReportPolicy,
    CbcReportPolicyPayload,
} from '@/app/plugins/cbc/types/reportPolicy';
import { cbcReportPolicyAPI } from '@/app/plugins/cbc/api/reportPolicies';

const ROUNDING_OPTIONS = [
    { value: 'ROUND_HALF_UP', label: 'Round Half Up' },
    { value: 'ROUND_DOWN', label: 'Round Down' },
    { value: 'ROUND_UP', label: 'Round Up' },
] as const;

interface CbcSubjectProfileOption {
    id: number;
    label: string;
}

interface CbcCohortSubjectOption {
    id: number;
    label: string;
    subjectProfileId?: number | null;
}

interface CbcTermOption {
    id: number;
    label: string;
}

interface FormErrors {
    name?: string;
    assessment_weights?: string;
    level_scale?: string;
}

interface CbcPolicyFormState {
    name: string;
    description: string;
    subject_profile: number | null;
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
    subjectProfiles: CbcSubjectProfileOption[];
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

function buildEmptyForm(): CbcPolicyFormState {
    return {
        name: '',
        description: '',
        subject_profile: null,
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
        subject_profile: policy.subject_profile,
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

export function CbcReportPolicyFormModal({
    editingPolicy,
    defaultPolicy = null,
    subjectProfiles,
    cohortSubjects,
    terms,
    onSuccess,
    onClose,
}: CbcReportPolicyFormModalProps) {
    const initialState = useMemo(
        () => (
            editingPolicy
                ? payloadToForm(editingPolicy)
                : templateToForm(defaultPolicy ?? null)
        ),
        [defaultPolicy, editingPolicy],
    );
    const [form, setForm] = useState<CbcPolicyFormState>(initialState);
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const setField = <K extends keyof CbcPolicyFormState>(field: K, value: CbcPolicyFormState[K]) => {
        setForm((previous) => ({ ...previous, [field]: value }));
        if (field in errors) {
            setErrors((previous) => {
                const next = { ...previous };
                delete next[field as keyof FormErrors];
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

    const applyEntryMidtermPreset = () => {
        setField(
            'assessment_weights',
            Object.entries(CBC_ENTRY_MIDTERM_PRESET.assessment_weights).map(([type, weight]) => ({
                type,
                weight: String(weight),
            })),
        );
        setField('required_components', [...CBC_ENTRY_MIDTERM_PRESET.required_components]);
        setField('diagnostic_assessment_types', [...CBC_ENTRY_MIDTERM_PRESET.diagnostic_assessment_types]);
    };

    const validate = (): boolean => {
        const nextErrors: FormErrors = {};

        if (!form.name.trim()) {
            nextErrors.name = 'Policy name is required.';
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

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!validate()) return;

        setSaving(true);
        setSaveError(null);

        try {
            const payload: CbcReportPolicyPayload = {
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                subject_profile: form.subject_profile,
                cbc_cohort_subject: form.cbc_cohort_subject,
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
                include_assignments: form.include_assignments,
                include_projects: form.include_projects,
                include_practicals: form.include_practicals,
                rounding_mode: form.rounding_mode,
                is_default: form.is_default,
                is_active: form.is_active,
            };

            const saved = editingPolicy
                ? await cbcReportPolicyAPI.update(editingPolicy.id, payload)
                : await cbcReportPolicyAPI.create(payload);

            onSuccess(saved);
        } catch (error) {
            setSaveError(extractErrorMessage(error as ApiError, 'Failed to save CBC report policy.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={editingPolicy ? 'Edit CBC Report Policy' : 'New CBC Report Policy'}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
                {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <Input
                            label="Policy Name"
                            value={form.name}
                            onChange={(event) => setField('name', event.target.value)}
                            placeholder="e.g., Grade 7 End Term CBC Policy"
                            required
                            error={errors.name}
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

                <div className="grid gap-4 md:grid-cols-3">
                    <Select
                        label="Subject Profile"
                        value={form.subject_profile?.toString() ?? ''}
                        onChange={(event) => setField(
                            'subject_profile',
                            event.target.value ? Number(event.target.value) : null,
                        )}
                        options={[
                            { value: '', label: 'Any subject profile' },
                            ...subjectProfiles.map((profile) => ({
                                value: String(profile.id),
                                label: profile.label,
                            })),
                        ]}
                    />
                    <Select
                        label="CBC Cohort Subject"
                        value={form.cbc_cohort_subject?.toString() ?? ''}
                        onChange={(event) => {
                            const selectedId = event.target.value ? Number(event.target.value) : null;
                            setField('cbc_cohort_subject', selectedId);

                            if (!selectedId) return;

                            const selectedOption = cohortSubjects.find((option) => option.id === selectedId);
                            if (selectedOption?.subjectProfileId) {
                                setField('subject_profile', selectedOption.subjectProfileId);
                            }
                        }}
                        options={[
                            { value: '', label: 'Any CBC cohort subject' },
                            ...cohortSubjects.map((subject) => ({
                                value: String(subject.id),
                                label: subject.label,
                            })),
                        ]}
                    />
                    <Select
                        label="Term"
                        value={form.term?.toString() ?? ''}
                        onChange={(event) => setField('term', event.target.value ? Number(event.target.value) : null)}
                        options={[
                            { value: '', label: 'Any term' },
                            ...terms.map((term) => ({
                                value: String(term.id),
                                label: term.label,
                            })),
                        ]}
                    />
                </div>

                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                    CBC report policies are plugin-owned. Assessment pages only preview these rules and link back here for policy authoring.
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-700">Preset</p>
                        <Button type="button" variant="secondary" size="sm" onClick={applyEntryMidtermPreset}>
                            ENTRY 30 + MIDTERM 70
                        </Button>
                    </div>
                    <CbcAssessmentWeightsEditor
                        entries={form.assessment_weights}
                        error={errors.assessment_weights}
                        onAdd={addWeightEntry}
                        onRemove={removeWeightEntry}
                        onChange={updateWeightEntry}
                    />
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="mb-2 text-sm font-medium text-gray-700">Required Components</p>
                    <div className="flex flex-wrap gap-2">
                        {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleArrayValue('required_components', option.value)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    form.required_components.includes(option.value)
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400'
                                }`}
                            >
                                {getAssessmentTypeLabel(option.value)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="mb-2 text-sm font-medium text-gray-700">Diagnostic Assessment Types</p>
                    <div className="flex flex-wrap gap-2">
                        {ASSESSMENT_TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleArrayValue('diagnostic_assessment_types', option.value)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    form.diagnostic_assessment_types.includes(option.value)
                                        ? 'border-green-600 bg-green-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-green-400'
                                }`}
                            >
                                {getAssessmentTypeLabel(option.value)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.include_assignments}
                                onChange={(event) => setField('include_assignments', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Include assignments</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.include_projects}
                                onChange={(event) => setField('include_projects', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Include projects</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.include_practicals}
                                onChange={(event) => setField('include_practicals', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Include practicals</span>
                        </label>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
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
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.is_default}
                                onChange={(event) => setField('is_default', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Default policy</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(event) => setField('is_active', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                        </label>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <CbcLevelScaleEditor
                        rows={form.level_scale}
                        error={errors.level_scale}
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
                            : (editingPolicy ? 'Save Changes' : 'Create CBC Report Policy')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

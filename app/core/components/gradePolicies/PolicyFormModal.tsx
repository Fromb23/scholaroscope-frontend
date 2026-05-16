'use client';

import type { FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { GradingScaleEditor } from '@/app/core/components/gradePolicies/GradingScaleEditor';
import { PolicyWeightsEditor } from '@/app/core/components/gradePolicies/PolicyWeightsEditor';
import { useCreatePolicyForm } from '@/app/core/hooks/useGradePolicies';
import { ASSESSMENT_TYPE_OPTIONS, getAssessmentTypeLabel } from '@/app/core/types/assessment';
import type { GradePolicy } from '@/app/core/types/gradePolicy';

const AGGREGATION_METHODS = [
    { value: 'WEIGHTED', label: 'Weighted Average' },
    { value: 'AVERAGE_PLUS_EXAM', label: 'Average CATs + Exam' },
    { value: 'PAPERS_AVERAGE', label: 'Average Papers' },
    { value: 'DROP_LOWEST', label: 'Drop Lowest CAT' },
    { value: 'EXAM_ONLY', label: 'Exam Only' },
];

const ASSESSMENT_TYPES = ASSESSMENT_TYPE_OPTIONS.map(option => option.value);

interface PolicyFormModalProps {
    editingPolicy: GradePolicy | null;
    cohorts: { id: number; name: string; level: string }[];
    cohortSubjects: { id: number; subject_name: string; subject_code: string; is_compulsory: boolean }[];
    curricula: { id: number; name: string }[];
    selectedCohort: number | null;
    onCohortChange: (id: number | null) => void;
    onSuccess: () => void;
    onClose: () => void;
}

export function PolicyFormModal({
    editingPolicy,
    cohorts,
    cohortSubjects,
    curricula,
    selectedCohort,
    onCohortChange,
    onSuccess,
    onClose,
}: PolicyFormModalProps) {
    const {
        form,
        errors,
        saving,
        saveError,
        setField,
        addWeightEntry,
        removeWeightEntry,
        updateWeightEntry,
        addGradingBand,
        removeGradingBand,
        updateGradingBand,
        toggleRequiredComponent,
        submit,
        dismissError,
    } = useCreatePolicyForm(onSuccess, editingPolicy);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        await submit();
    };

    const showWeights = ['WEIGHTED', 'AVERAGE_PLUS_EXAM', 'PAPERS_AVERAGE'].includes(
        form.aggregation_method
    );

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={editingPolicy ? 'Edit Policy' : 'New Grade Policy'}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
                {saveError && <ErrorBanner message={saveError} onDismiss={dismissError} />}

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <Input
                            label="Policy Name"
                            value={form.name}
                            onChange={(event) => setField('name', event.target.value)}
                            placeholder="e.g., Form 4 Weighted 40/60"
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
                            placeholder="Optional description"
                        />
                    </div>
                </div>

                <Select
                    label="Aggregation Method"
                    value={form.aggregation_method}
                    onChange={(event) => setField('aggregation_method', event.target.value)}
                    required
                    error={errors.aggregation_method}
                    options={[
                        { value: '', label: 'Select method...' },
                        ...AGGREGATION_METHODS,
                    ]}
                />

                <div className="border-t border-gray-100 pt-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">
                        Scope <span className="font-normal text-gray-400">(optional — leave blank for org-wide)</span>
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Cohort"
                            value={selectedCohort?.toString() ?? ''}
                            onChange={(event) => {
                                const id = event.target.value ? Number(event.target.value) : null;
                                onCohortChange(id);
                                setField('cohort', id);
                                setField('cohort_subject', null);
                            }}
                            options={[
                                { value: '', label: 'Any cohort' },
                                ...cohorts.map((cohort) => ({
                                    value: String(cohort.id),
                                    label: `${cohort.name} — ${cohort.level}`,
                                })),
                            ]}
                        />

                        <Select
                            label="Subject (within cohort)"
                            value={form.cohort_subject?.toString() ?? ''}
                            onChange={(event) => setField(
                                'cohort_subject',
                                event.target.value ? Number(event.target.value) : null
                            )}
                            disabled={!selectedCohort}
                            options={[
                                {
                                    value: '',
                                    label: selectedCohort ? 'Any subject' : 'Select cohort first',
                                },
                                ...cohortSubjects.map((cohortSubject) => ({
                                    value: String(cohortSubject.id),
                                    label: `${cohortSubject.subject_code} — ${cohortSubject.subject_name}`,
                                })),
                            ]}
                        />

                        <Select
                            label="Curriculum"
                            value={form.curriculum?.toString() ?? ''}
                            onChange={(event) => setField(
                                'curriculum',
                                event.target.value ? Number(event.target.value) : null
                            )}
                            options={[
                                { value: '', label: 'Any curriculum' },
                                ...curricula.map((curriculum) => ({
                                    value: String(curriculum.id),
                                    label: curriculum.name,
                                })),
                            ]}
                        />

                        <div className="flex items-center gap-6 pt-6">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.is_default}
                                    onChange={(event) => setField('is_default', event.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Default policy</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
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
                </div>

                {showWeights && (
                    <div className="border-t border-gray-100 pt-4">
                        <PolicyWeightsEditor
                            entries={form.weight_entries}
                            error={errors.weight_entries}
                            onAdd={addWeightEntry}
                            onRemove={removeWeightEntry}
                            onChange={updateWeightEntry}
                        />
                    </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                    <p className="mb-2 text-sm font-medium text-gray-700">
                        Required components
                        <span className="ml-1 text-xs font-normal text-gray-400">
                            — missing required → PROVISIONAL grade
                        </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {ASSESSMENT_TYPES.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => toggleRequiredComponent(type)}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    form.required_components.includes(type)
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400'
                                }`}
                            >
                                {getAssessmentTypeLabel(type)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">Advanced options</p>
                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="flex cursor-pointer items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={form.drop_lowest_cat}
                                onChange={(event) => setField('drop_lowest_cat', event.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Drop lowest CAT</span>
                        </label>
                        <Input
                            label="CAT score cap (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={form.cap_cat_score}
                            onChange={(event) => setField('cap_cat_score', event.target.value)}
                            placeholder="e.g. 40"
                        />
                        <Input
                            label="Exam score cap (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={form.cap_exam_score}
                            onChange={(event) => setField('cap_exam_score', event.target.value)}
                            placeholder="e.g. 70"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <GradingScaleEditor
                        bands={form.grading_scale}
                        error={errors.grading_scale}
                        onAdd={addGradingBand}
                        onRemove={removeGradingBand}
                        onChange={updateGradingBand}
                    />
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving
                            ? (editingPolicy ? 'Saving…' : 'Creating…')
                            : (editingPolicy ? 'Save Changes' : 'Create Policy')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

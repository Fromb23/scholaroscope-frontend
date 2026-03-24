'use client';

// ============================================================================
// app/(dashboard)/reports/grade-policies/page.tsx
// Responsibility: render only. No logic. No transforms. No API calls.
// ============================================================================

import { useState } from 'react';
import { Plus, Settings, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { useGradePolicies, useCreatePolicyForm } from '@/app/core/hooks/useGradePolicies';
import { PolicyWeightsEditor } from '@/app/core/components/gradePolicies/PolicyWeightsEditor';
import { GradingScaleEditor } from '@/app/core/components/gradePolicies/GradingScaleEditor';
import { PolicyHelpWidget } from '@/app/core/components/gradePolicies/PolicyHelpWidget';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { GradePolicy } from '@/app/core/types/gradePolicy';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

const AGGREGATION_METHODS = [
    { value: 'WEIGHTED', label: 'Weighted Average' },
    { value: 'AVERAGE_PLUS_EXAM', label: 'Average CATs + Exam' },
    { value: 'PAPERS_AVERAGE', label: 'Average Papers' },
    { value: 'DROP_LOWEST', label: 'Drop Lowest CAT' },
    { value: 'EXAM_ONLY', label: 'Exam Only' },
];

const ASSESSMENT_TYPES = [
    'CAT', 'TEST', 'MAIN_EXAM', 'MOCK',
    'PROJECT', 'ASSIGNMENT', 'PRACTICAL', 'COMPETENCY',
];

const SCOPE_LABELS: Record<string, string> = {
    WEIGHTED: 'Weighted Average',
    AVERAGE_PLUS_EXAM: 'Avg CATs + Exam',
    PAPERS_AVERAGE: 'Papers Average',
    DROP_LOWEST: 'Drop Lowest CAT',
    EXAM_ONLY: 'Exam Only',
};

export default function GradePoliciesPage() {
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<GradePolicy | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const {
        policies, loading, error,
        refetch, deletePolicy,
    } = useGradePolicies();

    const { cohorts } = useCohorts();
    const { curricula } = useCurricula();

    // CohortSubject cascade — driven by form's selected cohort
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
    const { subjects: cohortSubjects } = useCohortSubjects(selectedCohort ?? undefined);

    const handleOpen = (policy?: GradePolicy) => {
        setEditingPolicy(policy ?? null);
        if (policy?.cohort) setSelectedCohort(policy.cohort);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setEditingPolicy(null);
        setSelectedCohort(null);
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            await deletePolicy(id);
        } catch (err) {
            setDeleteError(extractErrorMessage(err as ApiError, 'Failed to delete policy'));
        } finally {
            setDeletingId(null);
        }
    };

    const handleSuccess = () => {
        refetch();
        handleClose();
    };

    if (loading && !policies.length) return <LoadingSpinner />;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Grade Computation Policies
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Define how final grades are calculated per cohort, subject or curriculum.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <PolicyHelpWidget />
                    <Button onClick={() => handleOpen()}>
                        <Plus className="h-4 w-4 mr-1.5" />New Policy
                    </Button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError(null)} />}

            {/* Table */}
            <Card>
                {policies.length === 0 ? (
                    <div className="py-16 text-center">
                        <Settings className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-900">No policies yet</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Create a policy to define grade computation rules.
                        </p>
                        <Button className="mt-4" onClick={() => handleOpen()}>
                            <Plus className="h-4 w-4 mr-1.5" />New Policy
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Policy</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead>Scale</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {policies.map(policy => (
                                <TableRow key={policy.id}>
                                    <TableCell>
                                        <p className="font-medium text-gray-900">{policy.name}</p>
                                        {policy.description && (
                                            <p className="text-xs text-gray-500 mt-0.5">{policy.description}</p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="blue">
                                            {SCOPE_LABELS[policy.aggregation_method] ?? policy.aggregation_method}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {policy.cohort_subject_name && <Badge variant="purple">{policy.cohort_subject_name}</Badge>}
                                            {policy.cohort_name && <Badge variant="indigo">{policy.cohort_name}</Badge>}
                                            {policy.curriculum_name && <Badge variant="default">{policy.curriculum_name}</Badge>}
                                            {policy.is_default && <Badge variant="orange">Default</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {policy.grading_scale?.length > 0
                                            ? <Badge variant="green">Custom ({policy.grading_scale.length} bands)</Badge>
                                            : <span className="text-xs text-gray-400">System default</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {policy.is_active
                                            ? <Badge variant="green"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                                            : <Badge variant="red"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => handleOpen(policy)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm" variant="ghost"
                                                onClick={() => handleDelete(policy.id)}
                                                disabled={deletingId === policy.id}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Create / Edit Modal */}
            {showModal && (
                <PolicyFormModal
                    editingPolicy={editingPolicy}
                    cohorts={cohorts}
                    cohortSubjects={cohortSubjects}
                    curricula={curricula}
                    selectedCohort={selectedCohort}
                    onCohortChange={setSelectedCohort}
                    onSuccess={handleSuccess}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}

// ── PolicyFormModal ───────────────────────────────────────────────────────

interface ModalProps {
    editingPolicy: GradePolicy | null;
    cohorts: { id: number; name: string; level: string }[];
    cohortSubjects: { id: number; subject_name: string; subject_code: string; is_compulsory: boolean }[];
    curricula: { id: number; name: string }[];
    selectedCohort: number | null;
    onCohortChange: (id: number | null) => void;
    onSuccess: () => void;
    onClose: () => void;
}

function PolicyFormModal({
    editingPolicy, cohorts, cohortSubjects, curricula,
    selectedCohort, onCohortChange, onSuccess, onClose,
}: ModalProps) {
    const {
        form, errors, saving, saveError,
        setField,
        addWeightEntry, removeWeightEntry, updateWeightEntry,
        addGradingBand, removeGradingBand, updateGradingBand,
        toggleRequiredComponent,
        submit, dismissError,
    } = useCreatePolicyForm(onSuccess, editingPolicy);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

                {saveError && <ErrorBanner message={saveError} onDismiss={dismissError} />}

                {/* Basic */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Policy Name"
                            value={form.name}
                            onChange={e => setField('name', e.target.value)}
                            placeholder="e.g., Form 4 Weighted 40/60"
                            required
                            error={errors.name}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setField('description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            placeholder="Optional description"
                        />
                    </div>
                </div>

                {/* Method */}
                <Select
                    label="Aggregation Method"
                    value={form.aggregation_method}
                    onChange={e => setField('aggregation_method', e.target.value)}
                    required
                    error={errors.aggregation_method}
                    options={[
                        { value: '', label: 'Select method...' },
                        ...AGGREGATION_METHODS,
                    ]}
                />

                {/* Scope */}
                <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                        Scope <span className="text-gray-400 font-normal">(optional — leave blank for org-wide)</span>
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">

                        {/* Cohort cascade */}
                        <Select
                            label="Cohort"
                            value={selectedCohort?.toString() ?? ''}
                            onChange={e => {
                                const id = e.target.value ? Number(e.target.value) : null;
                                onCohortChange(id);
                                setField('cohort', id);
                                setField('cohort_subject', null);
                            }}
                            options={[
                                { value: '', label: 'Any cohort' },
                                ...cohorts.map(c => ({
                                    value: String(c.id),
                                    label: `${c.name} — ${c.level}`,
                                })),
                            ]}
                        />

                        <Select
                            label="Subject (within cohort)"
                            value={form.cohort_subject?.toString() ?? ''}
                            onChange={e => setField('cohort_subject', e.target.value ? Number(e.target.value) : null)}
                            disabled={!selectedCohort}
                            options={[
                                {
                                    value: '',
                                    label: selectedCohort ? 'Any subject' : 'Select cohort first',
                                },
                                ...cohortSubjects.map(cs => ({
                                    value: String(cs.id),
                                    label: `${cs.subject_code} — ${cs.subject_name}`,
                                })),
                            ]}
                        />

                        <Select
                            label="Curriculum"
                            value={form.curriculum?.toString() ?? ''}
                            onChange={e => setField('curriculum', e.target.value ? Number(e.target.value) : null)}
                            options={[
                                { value: '', label: 'Any curriculum' },
                                ...curricula.map(c => ({
                                    value: String(c.id),
                                    label: c.name,
                                })),
                            ]}
                        />

                        <div className="flex items-center gap-6 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_default}
                                    onChange={e => setField('is_default', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Default policy</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => setField('is_active', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Active</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Weights */}
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

                {/* Required components */}
                <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Required components
                        <span className="ml-1 text-gray-400 font-normal text-xs">
                            — missing required → PROVISIONAL grade
                        </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {ASSESSMENT_TYPES.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => toggleRequiredComponent(type)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.required_components.includes(type)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advanced */}
                <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Advanced options</p>
                    <div className="grid md:grid-cols-3 gap-4">
                        <label className="flex items-center gap-2 cursor-pointer pt-6">
                            <input
                                type="checkbox"
                                checked={form.drop_lowest_cat}
                                onChange={e => setField('drop_lowest_cat', e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Drop lowest CAT</span>
                        </label>
                        <Input
                            label="CAT score cap (%)"
                            type="number" min="0" max="100"
                            value={form.cap_cat_score}
                            onChange={e => setField('cap_cat_score', e.target.value)}
                            placeholder="e.g. 40"
                        />
                        <Input
                            label="Exam score cap (%)"
                            type="number" min="0" max="100"
                            value={form.cap_exam_score}
                            onChange={e => setField('cap_exam_score', e.target.value)}
                            placeholder="e.g. 70"
                        />
                    </div>
                </div>

                {/* Grading scale */}
                <div className="border-t border-gray-100 pt-4">
                    <GradingScaleEditor
                        bands={form.grading_scale}
                        error={errors.grading_scale}
                        onAdd={addGradingBand}
                        onRemove={removeGradingBand}
                        onChange={updateGradingBand}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving
                            ? (editingPolicy ? 'Saving…' : 'Creating…')
                            : (editingPolicy ? 'Save Changes' : 'Create Policy')
                        }
                    </Button>
                </div>

            </form>
        </Modal>
    );
}
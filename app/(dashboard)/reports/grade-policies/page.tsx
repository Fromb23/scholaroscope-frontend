// ============================================================================
// app/(dashboard)/reports/grade-policies/page.tsx
// Grade Computation Policy Management
// ============================================================================

'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { useGradePolicies } from '@/app/core/hooks/useGradePolicies';
import { GradePolicy } from '@/app/core/types/gradePolicy';
import { useCohorts, useCurricula } from '@/app/core/hooks/useAcademic';
import { Settings, Plus, Edit, Trash2, Copy, CheckCircle, XCircle } from 'lucide-react';

interface CategoryConfig {
    assessment_type: string;
    weight: number;
    cap: number | null;
    combine_method: string;
    sequence: number;
}

export default function GradePoliciesPage() {
    const [showModal, setShowModal] = useState(false);


    const [editingPolicy, setEditingPolicy] = useState<GradePolicy | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cohort_subject: '',
        cohort: '',
        curriculum: '',
        aggregation_method: 'WEIGHTED',
        default_weighting: '{"CAT": 30, "MAIN_EXAM": 70}',
        drop_lowest_cat: false,
        cap_cat_score: '',
        cap_exam_score: '',
        is_active: true,
        is_default: false,
        category_configs: [] as CategoryConfig[]
    });

    const { policies, loading, createPolicy, updatePolicy, deletePolicy, duplicatePolicy } = useGradePolicies();
    const { cohorts } = useCohorts();
    const { curricula } = useCurricula();

    const aggregationMethods = [
        { value: 'AVERAGE_PLUS_EXAM', label: 'Average CATs + Exam' },
        { value: 'WEIGHTED', label: 'Weighted Average' },
        { value: 'PAPERS_AVERAGE', label: 'Average Papers (PP1, PP2)' },
        { value: 'DROP_LOWEST', label: 'Drop Lowest CAT' },
        { value: 'EXAM_ONLY', label: 'Exam Only' },
        { value: 'CUSTOM', label: 'Custom Formula' }
    ];

    const combineMethods = [
        { value: 'AVERAGE', label: 'Average' },
        { value: 'SUM', label: 'Sum' },
        { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average' },
        { value: 'BEST_OF', label: 'Best Score' },
        { value: 'DROP_LOWEST', label: 'Drop Lowest' }
    ];

    const assessmentTypes = [
        'CAT', 'TEST', 'MAIN_EXAM', 'PROJECT', 'ASSIGNMENT',
        'PRACTICAL', 'PP1', 'PP2', 'PP3'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const policyData: Record<string, unknown> = {
                name: formData.name,
                description: formData.description,
                aggregation_method: formData.aggregation_method,
                is_active: formData.is_active,
                is_default: formData.is_default
            };

            // Add context fields if provided
            if (formData.cohort_subject) policyData.cohort_subject = Number(formData.cohort_subject);
            if (formData.cohort) policyData.cohort = Number(formData.cohort);
            if (formData.curriculum) policyData.curriculum = Number(formData.curriculum);

            // Parse default weighting
            try {
                policyData.default_weighting = JSON.parse(formData.default_weighting);
            } catch {
                policyData.default_weighting = {};
            }

            // Add optional fields
            if (formData.drop_lowest_cat) policyData.drop_lowest_cat = true;
            if (formData.cap_cat_score) policyData.cap_cat_score = Number(formData.cap_cat_score);
            if (formData.cap_exam_score) policyData.cap_exam_score = Number(formData.cap_exam_score);

            // Add category configs if any
            if (formData.category_configs.length > 0) {
                policyData.category_configs = formData.category_configs;
            }

            if (editingPolicy) {
                await updatePolicy(editingPolicy.id, policyData);
            } else {
                await createPolicy(policyData);
            }

            setShowModal(false);
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            alert(message);
        }
    };

    const handleEdit = (policy: GradePolicy) => {
        setEditingPolicy(policy);
        setFormData({
            name: policy.name,
            description: policy.description || '',
            cohort_subject: policy.cohort_subject?.toString() || '',
            cohort: policy.cohort?.toString() || '',
            curriculum: policy.curriculum?.toString() || '',
            aggregation_method: policy.aggregation_method,
            default_weighting: JSON.stringify(policy.default_weighting || {}),
            drop_lowest_cat: policy.drop_lowest_cat || false,
            cap_cat_score: policy.cap_cat_score?.toString() || '',
            cap_exam_score: policy.cap_exam_score?.toString() || '',
            is_active: policy.is_active,
            is_default: policy.is_default,
            category_configs: (policy.category_configs || []).map(config => ({
                assessment_type: config.assessment_type,
                weight: config.weight,
                cap: config.cap ?? null,
                combine_method: config.combine_method,
                sequence: config.sequence
            }))
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this policy?')) {
            try {
                await deletePolicy(id);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete policy';
                alert(message);
            }
        }
    };

    const handleDuplicate = async (id: number) => {
        try {
            await duplicatePolicy(id);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to duplicate policy';
            alert(message);
        }
    };

    const addCategoryConfig = () => {
        setFormData(prev => ({
            ...prev,
            category_configs: [
                ...prev.category_configs,
                {
                    assessment_type: 'CAT',
                    weight: 0,
                    cap: null,
                    combine_method: 'AVERAGE',
                    sequence: prev.category_configs.length
                }
            ]
        }));
    };

    const removeCategoryConfig = (index: number) => {
        setFormData(prev => ({
            ...prev,
            category_configs: prev.category_configs.filter((_, i) => i !== index)
        }));
    };

    const updateCategoryConfig = (index: number, field: string, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            category_configs: prev.category_configs.map((config, i) =>
                i === index ? { ...config, [field]: value } : config
            )
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            cohort_subject: '',
            cohort: '',
            curriculum: '',
            aggregation_method: 'WEIGHTED',
            default_weighting: '{"CAT": 30, "MAIN_EXAM": 70}',
            drop_lowest_cat: false,
            cap_cat_score: '',
            cap_exam_score: '',
            is_active: true,
            is_default: false,
            category_configs: []
        });
        setEditingPolicy(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Grade Computation Policies</h1>
                    <p className="mt-2 text-gray-600">Define how final grades are calculated</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Policy
                </Button>
            </div>

            {/* Policies Table */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading policies...</p>
                    </div>
                ) : policies.length === 0 ? (
                    <div className="py-12 text-center">
                        <Settings className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No policies found</h3>
                        <p className="mt-1 text-sm text-gray-500">Create a policy to define grade computation rules</p>
                        <Button className="mt-4" onClick={() => setShowModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Policy
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Policy Name</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Context</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {policies.map((policy) => (
                                <TableRow key={policy.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-gray-900">{policy.name}</p>
                                            {policy.description && (
                                                <p className="text-sm text-gray-500">{policy.description}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="info">
                                            {aggregationMethods.find(m => m.value === policy.aggregation_method)?.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {policy.cohort_subject_name && (
                                                <Badge variant="default">{policy.cohort_subject_name}</Badge>
                                            )}
                                            {policy.cohort_name && (
                                                <Badge variant="default">{policy.cohort_name}</Badge>
                                            )}
                                            {policy.curriculum_name && (
                                                <Badge variant="default">{policy.curriculum_name}</Badge>
                                            )}
                                            {policy.is_default && (
                                                <Badge variant="warning">Default</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {policy.is_active ? (
                                            <Badge variant="success">
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="danger">
                                                <XCircle className="mr-1 h-3 w-3" />
                                                Inactive
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(policy)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDuplicate(policy.id)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(policy.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingPolicy ? 'Edit Policy' : 'Add New Policy'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Policy Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., CBC Grade 5 Math"
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Optional description"
                        />
                    </div>

                    <Select
                        label="Aggregation Method"
                        value={formData.aggregation_method}
                        onChange={(e) => setFormData({ ...formData, aggregation_method: e.target.value })}
                        options={[
                            { value: '', label: 'Select Method' },
                            ...aggregationMethods
                        ]}
                        required
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                        <Select
                            label="Cohort (Optional)"
                            value={formData.cohort}
                            onChange={(e) => setFormData({ ...formData, cohort: e.target.value })}
                            options={[
                                { value: '', label: 'Any Cohort' },
                                ...cohorts.map(c => ({ value: String(c.id), label: c.name }))
                            ]}
                        />

                        <Select
                            label="Curriculum (Optional)"
                            value={formData.curriculum}
                            onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                            options={[
                                { value: '', label: 'Any Curriculum' },
                                ...curricula.map(c => ({ value: String(c.id), label: c.name }))
                            ]}
                        />

                        <div className="flex items-center gap-4 pt-6">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Default Policy</span>
                            </label>
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Advanced Options</h3>

                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.drop_lowest_cat}
                                    onChange={(e) => setFormData({ ...formData, drop_lowest_cat: e.target.checked })}
                                    className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">Drop Lowest CAT</span>
                            </label>

                            <Input
                                label="CAT Score Cap"
                                type="number"
                                value={formData.cap_cat_score}
                                onChange={(e) => setFormData({ ...formData, cap_cat_score: e.target.value })}
                                placeholder="e.g., 30"
                            />

                            <Input
                                label="Exam Score Cap"
                                type="number"
                                value={formData.cap_exam_score}
                                onChange={(e) => setFormData({ ...formData, cap_exam_score: e.target.value })}
                                placeholder="e.g., 70"
                            />
                        </div>
                    </div>

                    {/* Category Configs */}
                    {formData.aggregation_method === 'WEIGHTED' && (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900">Category Configurations</h3>
                                <Button type="button" size="sm" onClick={addCategoryConfig}>
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add Category
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {formData.category_configs.map((config, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                        <div className="grid gap-3 md:grid-cols-5">
                                            <Select
                                                label="Type"
                                                value={config.assessment_type}
                                                onChange={(e) => updateCategoryConfig(index, 'assessment_type', e.target.value)}
                                                options={assessmentTypes.map(t => ({ value: t, label: t }))}
                                            />
                                            <Input
                                                label="Weight (%)"
                                                type="number"
                                                value={config.weight}
                                                onChange={(e) => updateCategoryConfig(index, 'weight', Number(e.target.value))}
                                            />
                                            <Input
                                                label="Cap"
                                                type="number"
                                                value={config.cap || ''}
                                                onChange={(e) => updateCategoryConfig(index, 'cap', e.target.value ? Number(e.target.value) : null)}
                                            />
                                            <Select
                                                label="Method"
                                                value={config.combine_method}
                                                onChange={(e) => updateCategoryConfig(index, 'combine_method', e.target.value)}
                                                options={combineMethods}
                                            />
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeCategoryConfig(index)}
                                                    className="w-full"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowModal(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingPolicy ? 'Update Policy' : 'Create Policy'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
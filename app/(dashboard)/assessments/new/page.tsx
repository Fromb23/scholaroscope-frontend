'use client';

// ============================================================================
// app/(dashboard)/assessments/new/page.tsx
// Responsibility: render only. No logic. No transforms. No API calls.
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useCreateAssessmentForm } from '@/app/core/hooks/useAssessments';
import { useRubricScales } from '@/app/core/hooks/useAssessments';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts, useCohortSubjects } from '@/app/core/hooks/useCohorts';
import { CohortSubject } from '@/app/core/types/academic';
import { useAuth } from '@/app/context/AuthContext';

const ASSESSMENT_TYPES = [
    { value: 'CAT', label: 'CAT' },
    { value: 'TEST', label: 'Test' },
    { value: 'MAIN_EXAM', label: 'Main Exam' },
    { value: 'MOCK', label: 'Mock' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'ASSIGNMENT', label: 'Assignment' },
    { value: 'PRACTICAL', label: 'Practical' },
    { value: 'COMPETENCY', label: 'Competency' },
];

const EVALUATION_TYPES = [
    { value: 'NUMERIC', label: 'Numeric (Marks-based)' },
    { value: 'RUBRIC', label: 'Rubric (Level-based)' },
    { value: 'DESCRIPTIVE', label: 'Descriptive' },
    { value: 'COMPETENCY', label: 'Competency' },
];

export default function CreateAssessmentPage() {
    const router = useRouter();
    const { user } = useAuth();

    const {
        form, errors, saving, saveError,
        selectedCohortId,
        setField, selectCohort, submit, dismissError,
    } = useCreateAssessmentForm(user?.email ?? 'system');

    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const { subjects } = useCohortSubjects(selectedCohortId || undefined);
    const { rubricScales } = useRubricScales();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await submit();
        if (result) router.push(`/assessments/${result.id}`);
    };

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/assessments">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />Back to Assessments
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Assessment</h1>
                    <p className="text-gray-500 mt-1">Set up a new assessment for your students</p>
                </div>
            </div>

            {saveError && <ErrorBanner message={saveError} onDismiss={dismissError} />}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Information */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <ClipboardList className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Cohort */}
                            <div>
                                <Select
                                    label="Cohort"
                                    value={selectedCohortId.toString()}
                                    onChange={e => selectCohort(Number(e.target.value))}
                                    required
                                    options={[
                                        { value: '0', label: 'Select Cohort' },
                                        ...cohorts.map(c => ({
                                            value: String(c.id),
                                            label: `${c.name} — ${c.level}`,
                                        })),
                                    ]}
                                />
                                {errors.cohort && <p className="mt-1 text-sm text-red-600">{errors.cohort}</p>}
                            </div>

                            {/* Subject */}
                            <div>
                                <Select
                                    label="Subject"
                                    value={form.cohort_subject.toString()}
                                    onChange={e => setField('cohort_subject', Number(e.target.value))}
                                    required
                                    disabled={!selectedCohortId}
                                    error={errors.cohort_subject}
                                    options={[
                                        {
                                            value: '0',
                                            label: selectedCohortId ? 'Select Subject' : 'Select a cohort first',
                                        },
                                        ...subjects?.map(cs => ({
                                            value: String(cs.id),
                                            label: `${cs.subject_code} — ${cs.subject_name}${cs.is_compulsory ? ' (Core)' : ''}`,
                                        })),
                                    ]}
                                />
                            </div>

                            {/* Name */}
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

                            {/* Assessment Type */}
                            <Select
                                label="Assessment Type"
                                value={form.assessment_type}
                                onChange={e => setField('assessment_type', e.target.value)}
                                required
                                options={ASSESSMENT_TYPES}
                            />

                            {/* Term */}
                            <div>
                                <Select
                                    label="Term (Optional)"
                                    value={form.term?.toString() ?? ''}
                                    onChange={e => setField('term', e.target.value ? Number(e.target.value) : null)}
                                    disabled={!form.cohort_subject}
                                    options={[
                                        { value: '', label: 'No Term (Year-round)' },
                                        ...terms.map(t => ({
                                            value: String(t.id),
                                            label: `${t.academic_year_name} — ${t.name}`,
                                        })),
                                    ]}
                                />
                                <p className="mt-1 text-xs text-gray-500">Optional for CBC/CBE curriculum</p>
                            </div>

                            {/* Date */}
                            <Input
                                label="Assessment Date"
                                type="date"
                                value={form.assessment_date}
                                onChange={e => setField('assessment_date', e.target.value)}
                            />

                        </div>
                    </div>
                </Card>

                {/* Evaluation Settings */}
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
                                                .filter(r => r.is_active)
                                                .map(r => ({
                                                    value: String(r.id),
                                                    label: `${r.name} (${r.curriculum_name})`,
                                                })),
                                        ]}
                                    />
                                    {errors.rubric_scale && <p className="mt-1 text-sm text-red-600">{errors.rubric_scale}</p>}
                                </div>
                            )}

                        </div>
                    </div>
                </Card>

                {/* Description */}
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Add assessment objectives, topics covered, or any additional notes…"
                            />
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Link href="/assessments">
                        <Button type="button" variant="ghost">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Creating…' : 'Create Assessment'}
                    </Button>
                </div>

            </form>
        </div>
    );
}
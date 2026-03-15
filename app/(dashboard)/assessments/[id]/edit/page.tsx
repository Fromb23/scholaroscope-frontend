'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, ClipboardList } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useAssessmentDetail, useRubricScales } from '@/app/core/hooks/useAssessments';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useCohortSubjects } from '@/app/core/hooks/useSessions';
import { assessmentAPI } from '@/app/core/api/assessments';
import { AssessmentFormData } from '@/app/core/types/assessment';

export default function EditAssessmentPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { assessment } = useAssessmentDetail(assessmentId);
    const { terms } = useTerms();
    const { cohorts } = useCohorts();
    const { rubricScales } = useRubricScales();

    const [selectedCohort, setSelectedCohort] = useState<number>(0);
    const { cohortSubjects } = useCohortSubjects(selectedCohort || null);

    const [formData, setFormData] = useState<AssessmentFormData>({
        cohort_subject: 0,
        term: null,
        name: '',
        assessment_type: 'CAT',
        evaluation_type: 'NUMERIC',
        total_marks: 100,
        rubric_scale: null,
        assessment_date: new Date().toISOString().split('T')[0],
        description: '',
        weight: 1.0
    });

    const assessmentTypes = [
        { value: 'CAT', label: 'CAT' },
        { value: 'TEST', label: 'Test' },
        { value: 'MAIN_EXAM', label: 'Main Exam' },
        { value: 'MOCK', label: 'Mock' },
        { value: 'PROJECT', label: 'Project' },
        { value: 'ASSIGNMENT', label: 'Assignment' },
        { value: 'PRACTICAL', label: 'Practical' },
        { value: 'COMPETENCY', label: 'Competency' }
    ];

    const evaluationTypes = [
        { value: 'NUMERIC', label: 'Numeric (Marks-based)' },
        { value: 'RUBRIC', label: 'Rubric (Level-based)' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' },
        { value: 'COMPETENCY', label: 'Competency' }
    ];

    useEffect(() => {
        if (assessment) {
            setSelectedCohort(assessment.cohort_id);
            setFormData({
                cohort_subject: assessment.cohort_subject,
                term: assessment.term,
                name: assessment.name,
                assessment_type: assessment.assessment_type,
                evaluation_type: assessment.evaluation_type,
                total_marks: assessment.total_marks,
                rubric_scale: assessment.rubric_scale,
                assessment_date: assessment.assessment_date,
                description: assessment.description,
                weight: assessment.weight
            });
            setLoading(false);
        }
    }, [assessment]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!selectedCohort) newErrors.cohort = 'Cohort is required';
        if (!formData.cohort_subject) newErrors.cohort_subject = 'Subject is required';
        if (!formData.name.trim()) newErrors.name = 'Assessment name is required';

        if (formData.evaluation_type === 'NUMERIC' && !formData.total_marks) {
            newErrors.total_marks = 'Total marks required for numeric assessments';
        }

        if (formData.evaluation_type === 'RUBRIC' && !formData.rubric_scale) {
            newErrors.rubric_scale = 'Rubric scale required for rubric-based assessments';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            await assessmentAPI.update(assessmentId, formData);
            router.push(`/assessments/${assessmentId}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update assessment';
            alert(message);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof AssessmentFormData | 'cohort', value: any) => {
        if (field === 'cohort') {
            const cohortId = value;
            setSelectedCohort(cohortId);
            setFormData(prev => ({ ...prev, cohort_subject: 0 }));
            if (errors.cohort) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.cohort;
                    return newErrors;
                });
            }
            return;
        }

        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Clear dependent fields when evaluation type changes
            if (field === 'evaluation_type') {
                if (value === 'NUMERIC') {
                    updated.rubric_scale = null;
                    updated.total_marks = 100;
                } else if (value === 'RUBRIC') {
                    updated.total_marks = null;
                }
            }

            return updated;
        });

        // Clear error
        if (errors[field as string]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field as string];
                return newErrors;
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/assessments/${assessmentId}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Assessment
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Assessment</h1>
                    <p className="text-gray-600 mt-1">Update assessment information</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <ClipboardList className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cohort (Read-only for edit) */}
                            <div>
                                <Select
                                    label="Cohort"
                                    value={selectedCohort.toString()}
                                    onChange={(e) => handleChange('cohort', Number(e.target.value))}
                                    required
                                    options={[
                                        { value: '0', label: 'Select Cohort' },
                                        ...cohorts.map(c => ({
                                            value: String(c.id),
                                            label: `${c.name} - ${c.level}`
                                        }))
                                    ]}
                                />
                                <p className="mt-1 text-xs text-yellow-600">
                                    ⚠️ Changing cohort will reset subject selection
                                </p>
                            </div>

                            {/* Subject (CohortSubject) */}
                            <div>
                                <Select
                                    label="Subject"
                                    value={formData.cohort_subject.toString()}
                                    onChange={(e) => handleChange('cohort_subject', Number(e.target.value))}
                                    required
                                    disabled={!selectedCohort}
                                    options={[
                                        {
                                            value: '0',
                                            label: selectedCohort ? 'Select Subject' : 'Select a cohort first'
                                        },
                                        ...cohortSubjects.map(cs => ({
                                            value: String(cs.id),
                                            label: `${cs.subject_code} - ${cs.subject_name}${cs.is_compulsory ? ' (Core)' : ''}`
                                        }))
                                    ]}
                                />
                                {errors.cohort_subject && (
                                    <p className="mt-1 text-sm text-red-600">{errors.cohort_subject}</p>
                                )}
                            </div>

                            {/* Assessment Name */}
                            <div>
                                <Input
                                    label="Assessment Name"
                                    placeholder="e.g., CAT 1, Mid-Term Exam"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            {/* Assessment Type */}
                            <div>
                                <Select
                                    label="Assessment Type"
                                    value={formData.assessment_type}
                                    onChange={(e) => handleChange('assessment_type', e.target.value)}
                                    required
                                    options={assessmentTypes}
                                />
                            </div>

                            {/* Term */}
                            <div>
                                <Select
                                    label="Term (Optional)"
                                    value={formData.term?.toString() || ''}
                                    onChange={(e) => handleChange('term', e.target.value ? Number(e.target.value) : null)}
                                    options={[
                                        { value: '', label: 'No Term (Year-round)' },
                                        ...terms.map(term => ({
                                            value: String(term.id),
                                            label: `${term.academic_year_name} - ${term.name}`
                                        }))
                                    ]}
                                />
                            </div>

                            {/* Assessment Date */}
                            <div>
                                <Input
                                    label="Assessment Date"
                                    type="date"
                                    value={formData.assessment_date || ''}
                                    onChange={(e) => handleChange('assessment_date', e.target.value)}
                                />
                            </div>

                            {/* Weight */}
                            <div>
                                <Input
                                    label="Weight"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={formData.weight}
                                    onChange={(e) => handleChange('weight', parseFloat(e.target.value))}
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Weight for final grade calculation
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Evaluation Settings */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Evaluation Settings</h2>

                        <div className="space-y-6">
                            <div>
                                <Select
                                    label="Evaluation Type"
                                    value={formData.evaluation_type}
                                    onChange={(e) => handleChange('evaluation_type', e.target.value)}
                                    required
                                    options={evaluationTypes}
                                />
                                <p className="mt-1 text-xs text-yellow-600">
                                    ⚠️ Changing evaluation type may affect existing scores
                                </p>
                            </div>

                            {formData.evaluation_type === 'NUMERIC' && (
                                <div>
                                    <Input
                                        label="Total Marks"
                                        type="number"
                                        min="1"
                                        value={formData.total_marks || ''}
                                        onChange={(e) => handleChange('total_marks', parseFloat(e.target.value))}
                                        required
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
                                        value={formData.rubric_scale?.toString() || ''}
                                        onChange={(e) => handleChange('rubric_scale', e.target.value ? Number(e.target.value) : null)}
                                        required
                                        options={[
                                            { value: '', label: 'Select Rubric Scale' },
                                            ...rubricScales
                                                .filter(r => r.is_active)
                                                .map(scale => ({
                                                    value: String(scale.id),
                                                    label: `${scale.name} (${scale.curriculum_name})`
                                                }))
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

                {/* Additional Details */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Add assessment objectives, topics covered, or any additional notes..."
                            />
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Link href={`/assessments/${assessmentId}`}>
                        <Button type="button" variant="ghost">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
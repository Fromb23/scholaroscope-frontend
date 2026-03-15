'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useProjects } from '@/app/plugins/projects/hooks/useProjects';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { useRubricScales } from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import { ProjectFormData } from '@/app/plugins/projects/types/project';

export default function CreateProjectPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { createProject } = useProjects();
    const { terms } = useTerms();
    const { subjects } = useSubjects();
    const { rubricScales } = useRubricScales();

    const [formData, setFormData] = useState<ProjectFormData>({
        subject: 0,
        term: null,
        name: '',
        description: '',
        start_date: null,
        end_date: null,
        total_marks: 100,
        evaluation_type: 'NUMERIC',
        rubric_scale: null
    });

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const evaluationTypes = [
        { value: 'NUMERIC', label: 'Numeric (Marks-based)' },
        { value: 'RUBRIC', label: 'Rubric (Level-based)' },
        { value: 'DESCRIPTIVE', label: 'Descriptive' }
    ];

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.subject) newErrors.subject = 'Subject is required';
        if (!formData.name.trim()) newErrors.name = 'Project name is required';

        if (formData.start_date && formData.end_date) {
            if (formData.start_date > formData.end_date) {
                newErrors.end_date = 'End date must be after start date';
            }
        }

        if (formData.evaluation_type === 'NUMERIC' && !formData.total_marks) {
            newErrors.total_marks = 'Total marks required for numeric evaluation';
        }

        if (formData.evaluation_type === 'RUBRIC' && !formData.rubric_scale) {
            newErrors.rubric_scale = 'Rubric scale required for rubric-based evaluation';
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
            const projectData = {
                ...formData,
                created_by: user?.email || 'system'
            };

            const newProject = await createProject(projectData);
            router.push(`/projects/${newProject.id}`);
        } catch (error: any) {
            alert(error.message || 'Failed to create project');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof ProjectFormData, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            if (field === 'evaluation_type') {
                if (value === 'NUMERIC') {
                    updated.rubric_scale = null;
                    updated.total_marks = 100;
                } else if (value === 'RUBRIC') {
                    updated.total_marks = null;
                } else if (value === 'DESCRIPTIVE') {
                    updated.total_marks = null;
                    updated.rubric_scale = null;
                }
            }

            return updated;
        });

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/projects">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Projects
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900">Create New Project</h1>
                    <p className="text-gray-600 mt-1">Set up a new project-based learning activity</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <FolderKanban className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Input
                                    label="Project Name"
                                    placeholder="e.g., Science Fair, Research Paper"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Select
                                    label="Subject"
                                    value={formData.subject.toString()}
                                    onChange={(e) => handleChange('subject', Number(e.target.value))}
                                    required options={[]}                                >
                                    <option value="0">Select Subject</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.code} - {subject.name}
                                        </option>
                                    ))}
                                </Select>
                                {errors.subject && (
                                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                                )}
                            </div>

                            <div>
                                <Select
                                    label="Term (Optional)"
                                    value={formData.term?.toString() || ''}
                                    onChange={(e) => handleChange('term', e.target.value ? Number(e.target.value) : null)} options={[]}                                >
                                    <option value="">No Term (Cross-term)</option>
                                    {terms.map(term => (
                                        <option key={term.id} value={term.id}>
                                            {term.academic_year_name} - {term.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={4}
                                    placeholder="Describe the project objectives, requirements, and deliverables..."
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Timeline */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Timeline</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={formData.start_date || ''}
                                    onChange={(e) => handleChange('start_date', e.target.value)}
                                />
                            </div>

                            <div>
                                <Input
                                    label="End Date"
                                    type="date"
                                    value={formData.end_date || ''}
                                    onChange={(e) => handleChange('end_date', e.target.value)}
                                />
                                {errors.end_date && (
                                    <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                                )}
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
                                    required options={[]}                                >
                                    {evaluationTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </Select>
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
                                        required options={[]}                                    >
                                        <option value="">Select Rubric Scale</option>
                                        {rubricScales.filter(r => r.is_active).map(scale => (
                                            <option key={scale.id} value={scale.id}>
                                                {scale.name}
                                            </option>
                                        ))}
                                    </Select>
                                    {errors.rubric_scale && (
                                        <p className="mt-1 text-sm text-red-600">{errors.rubric_scale}</p>
                                    )}
                                </div>
                            )}

                            {formData.evaluation_type === 'DESCRIPTIVE' && (
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> Descriptive evaluation allows for qualitative feedback without numeric scores.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Link href="/projects">
                        <Button type="button" variant="primary">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Creating...' : 'Create Project'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
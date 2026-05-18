'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import type { LessonPlan, LessonPlanUpdatePayload } from '@/app/core/types/lessonPlans';

const TEXTAREA_CLASSNAME =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

interface LessonPlanFormProps {
    lessonPlan: LessonPlan;
    onSubmit: (payload: LessonPlanUpdatePayload) => Promise<LessonPlan>;
}

interface LessonPlanFormState {
    title: string;
    objectives: string[];
    prior_knowledge: string;
    learning_resources: string[];
    introduction: string;
    lesson_development: string;
    learner_activities: string;
    assessment_strategy: string;
    differentiation: string;
    conclusion: string;
    reflection: string;
}

function buildInitialState(lessonPlan: LessonPlan): LessonPlanFormState {
    return {
        title: lessonPlan.title ?? '',
        objectives: lessonPlan.objectives?.length ? lessonPlan.objectives : [''],
        prior_knowledge: lessonPlan.prior_knowledge ?? '',
        learning_resources: lessonPlan.learning_resources?.length ? lessonPlan.learning_resources : [''],
        introduction: lessonPlan.introduction ?? '',
        lesson_development: lessonPlan.lesson_development ?? '',
        learner_activities: lessonPlan.learner_activities ?? '',
        assessment_strategy: lessonPlan.assessment_strategy ?? '',
        differentiation: lessonPlan.differentiation ?? '',
        conclusion: lessonPlan.conclusion ?? '',
        reflection: lessonPlan.reflection ?? '',
    };
}

function cleanStringList(values: string[]): string[] {
    return values.map((value) => value.trim()).filter(Boolean);
}

function RepeatableListField({
    label,
    values,
    addLabel,
    onChange,
    onAdd,
    onRemove,
}: {
    label: string;
    values: string[];
    addLabel: string;
    onChange: (index: number, value: string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {addLabel}
                </Button>
            </div>

            <div className="space-y-2">
                {values.map((value, index) => (
                    <div key={`${label}-${index}`} className="flex items-start gap-2">
                        <Input
                            value={value}
                            onChange={(event) => onChange(index, event.target.value)}
                            placeholder={`${label} ${index + 1}`}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(index)}
                            disabled={values.length === 1}
                            aria-label={`Remove ${label} ${index + 1}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LessonPlanForm({ lessonPlan, onSubmit }: LessonPlanFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<LessonPlanFormState>(() => buildInitialState(lessonPlan));
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFormData(buildInitialState(lessonPlan));
    }, [lessonPlan]);

    const updateField = (field: keyof LessonPlanFormState, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setFormError(null);
    };

    const updateListField = (
        field: 'objectives' | 'learning_resources',
        index: number,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: prev[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
        }));
        setFormError(null);
    };

    const addListItem = (field: 'objectives' | 'learning_resources') => {
        setFormData((prev) => ({
            ...prev,
            [field]: [...prev[field], ''],
        }));
    };

    const removeListItem = (field: 'objectives' | 'learning_resources', index: number) => {
        setFormData((prev) => {
            const nextValues = prev[field].filter((_, itemIndex) => itemIndex !== index);
            return {
                ...prev,
                [field]: nextValues.length > 0 ? nextValues : [''],
            };
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formData.title.trim()) {
            setFormError('Title is required.');
            return;
        }

        setSaving(true);
        setFormError(null);

        try {
            const updated = await onSubmit({
                title: formData.title.trim(),
                objectives: cleanStringList(formData.objectives),
                prior_knowledge: formData.prior_knowledge.trim(),
                learning_resources: cleanStringList(formData.learning_resources),
                introduction: formData.introduction.trim(),
                lesson_development: formData.lesson_development.trim(),
                learner_activities: formData.learner_activities.trim(),
                assessment_strategy: formData.assessment_strategy.trim(),
                differentiation: formData.differentiation.trim(),
                conclusion: formData.conclusion.trim(),
                reflection: formData.reflection.trim(),
            });

            router.push(`/lesson-plans/${updated.id}?notice=updated`);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save lesson plan.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            <Card>
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Lesson Context
                    </p>
                    <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
                        <div>
                            <p className="text-xs text-gray-500">Lesson</p>
                            <p className="font-medium text-gray-900">
                                {lessonPlan.session_title || lessonPlan.title || 'Not scheduled yet'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Lesson Date</p>
                            <p className="font-medium text-gray-900">{lessonPlan.session_date || lessonPlan.planned_date || 'Not set'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Cohort</p>
                            <p className="font-medium text-gray-900">{lessonPlan.cohort_name || 'Not set'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Subject</p>
                            <p className="font-medium text-gray-900">{lessonPlan.subject_name || 'Not set'}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-5">
                    <Input
                        label="Title"
                        value={formData.title}
                        onChange={(event) => updateField('title', event.target.value)}
                        placeholder="Lesson plan title"
                    />

                    <RepeatableListField
                        label="Objectives"
                        values={formData.objectives}
                        addLabel="Add objective"
                        onChange={(index, value) => updateListField('objectives', index, value)}
                        onAdd={() => addListItem('objectives')}
                        onRemove={(index) => removeListItem('objectives', index)}
                    />

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Prior Knowledge</label>
                        <textarea
                            value={formData.prior_knowledge}
                            onChange={(event) => updateField('prior_knowledge', event.target.value)}
                            rows={3}
                            className={TEXTAREA_CLASSNAME}
                        />
                    </div>

                    <RepeatableListField
                        label="Learning Resources"
                        values={formData.learning_resources}
                        addLabel="Add resource"
                        onChange={(index, value) => updateListField('learning_resources', index, value)}
                        onAdd={() => addListItem('learning_resources')}
                        onRemove={(index) => removeListItem('learning_resources', index)}
                    />

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Introduction</label>
                            <textarea
                                value={formData.introduction}
                                onChange={(event) => updateField('introduction', event.target.value)}
                                rows={5}
                                className={TEXTAREA_CLASSNAME}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Lesson Development</label>
                            <textarea
                                value={formData.lesson_development}
                                onChange={(event) => updateField('lesson_development', event.target.value)}
                                rows={5}
                                className={TEXTAREA_CLASSNAME}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Learner Activities</label>
                            <textarea
                                value={formData.learner_activities}
                                onChange={(event) => updateField('learner_activities', event.target.value)}
                                rows={5}
                                className={TEXTAREA_CLASSNAME}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Assessment Strategy</label>
                            <textarea
                                value={formData.assessment_strategy}
                                onChange={(event) => updateField('assessment_strategy', event.target.value)}
                                rows={5}
                                className={TEXTAREA_CLASSNAME}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Differentiation</label>
                            <textarea
                                value={formData.differentiation}
                                onChange={(event) => updateField('differentiation', event.target.value)}
                                rows={5}
                                className={TEXTAREA_CLASSNAME}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Conclusion</label>
                            <textarea
                                value={formData.conclusion}
                                onChange={(event) => updateField('conclusion', event.target.value)}
                                rows={5}
                                className={TEXTAREA_CLASSNAME}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Reflection</label>
                        <textarea
                            value={formData.reflection}
                            onChange={(event) => updateField('reflection', event.target.value)}
                            rows={5}
                            className={TEXTAREA_CLASSNAME}
                        />
                    </div>
                </div>
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Link href={`/lesson-plans/${lessonPlan.id}`}>
                    <Button type="button" variant="secondary">
                        Cancel
                    </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}

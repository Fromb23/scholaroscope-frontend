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
    description,
    values,
    addLabel,
    placeholder,
    rows = 3,
    multiline = false,
    onChange,
    onAdd,
    onRemove,
}: {
    label: string;
    description?: string;
    values: string[];
    addLabel: string;
    placeholder?: string;
    rows?: number;
    multiline?: boolean;
    onChange: (index: number, value: string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    {description ? (
                        <p className="text-sm text-gray-500">{description}</p>
                    ) : null}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="w-full sm:w-auto">
                    <Plus className="mr-1.5 h-4 w-4" />
                    {addLabel}
                </Button>
            </div>

            <div className="space-y-3">
                {values.map((value, index) => (
                    <div key={`${label}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                {label} {index + 1}
                            </p>
                            {multiline ? (
                                <textarea
                                    value={value}
                                    onChange={(event) => onChange(index, event.target.value)}
                                    placeholder={placeholder ?? `${label} ${index + 1}`}
                                    rows={rows}
                                    className={TEXTAREA_CLASSNAME}
                                />
                            ) : (
                                <Input
                                    value={value}
                                    onChange={(event) => onChange(index, event.target.value)}
                                    placeholder={placeholder ?? `${label} ${index + 1}`}
                                />
                            )}
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(index)}
                                disabled={values.length === 1}
                                aria-label={`Remove ${label} ${index + 1}`}
                            >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Remove
                            </Button>
                        </div>
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
        <form id="lesson-plan-form" onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
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
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Basic Details
                        </p>
                        <p className="text-sm text-gray-500">
                            Adjust the lesson title and teacher-facing objectives.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <textarea
                            value={formData.title}
                            onChange={(event) => updateField('title', event.target.value)}
                            placeholder="Lesson plan title"
                            rows={2}
                            className={TEXTAREA_CLASSNAME}
                        />
                    </div>

                    <RepeatableListField
                        label="Objectives"
                        description="Keep each objective readable in full. Generated objectives can be edited line by line."
                        values={formData.objectives}
                        addLabel="Add objective"
                        placeholder="Write one lesson objective"
                        rows={3}
                        multiline
                        onChange={(index, value) => updateListField('objectives', index, value)}
                        onAdd={() => addListItem('objectives')}
                        onRemove={(index) => removeListItem('objectives', index)}
                    />
                </div>
            </Card>

            <Card>
                <div className="space-y-5">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Preparation
                        </p>
                        <p className="text-sm text-gray-500">
                            Capture what learners already know and what you need ready before class.
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Prior Knowledge</label>
                        <textarea
                            value={formData.prior_knowledge}
                            onChange={(event) => updateField('prior_knowledge', event.target.value)}
                            rows={4}
                            className={TEXTAREA_CLASSNAME}
                        />
                    </div>

                    <RepeatableListField
                        label="Learning Resources"
                        description="Use one item per resource so long generated resource notes stay readable."
                        values={formData.learning_resources}
                        addLabel="Add resource"
                        placeholder="Describe a learning resource"
                        rows={3}
                        multiline
                        onChange={(index, value) => updateListField('learning_resources', index, value)}
                        onAdd={() => addListItem('learning_resources')}
                        onRemove={(index) => removeListItem('learning_resources', index)}
                    />
                </div>
            </Card>

            <Card>
                <div className="space-y-5">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Lesson Flow
                        </p>
                        <p className="text-sm text-gray-500">
                            Keep the lesson narrative comfortable to read and edit from top to bottom.
                        </p>
                    </div>

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
                            rows={6}
                            className={TEXTAREA_CLASSNAME}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Learner Activities</label>
                        <textarea
                            value={formData.learner_activities}
                            onChange={(event) => updateField('learner_activities', event.target.value)}
                            rows={6}
                            className={TEXTAREA_CLASSNAME}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <div className="space-y-5">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Assessment And Reflection
                        </p>
                        <p className="text-sm text-gray-500">
                            Review how the lesson closes, how learning is checked, and what you want to improve next time.
                        </p>
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

            <div className="hidden flex-wrap items-center justify-end gap-3 md:flex">
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

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
                <div className="mx-auto flex max-w-5xl gap-3">
                    <Link href={`/lesson-plans/${lessonPlan.id}`} className="flex-1">
                        <Button type="button" variant="secondary" className="w-full">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" form="lesson-plan-form" className="flex-1" disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

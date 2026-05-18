import { Card } from '@/app/components/ui/Card';
import type { LessonPlan } from '@/app/core/types/lessonPlans';

function formatLabel(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatContextValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'Not provided';
    }

    if (typeof value === 'string') {
        return value.trim() || 'Not provided';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return 'No items';
        }

        const primitiveValues = value.filter(
            (item) =>
                typeof item === 'string' ||
                typeof item === 'number' ||
                typeof item === 'boolean'
        );

        if (primitiveValues.length === value.length && value.length <= 6) {
            return primitiveValues.join(', ');
        }

        return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }

    if (typeof value === 'object') {
        const keys = Object.keys(value as Record<string, unknown>);

        if (keys.length === 0) {
            return 'Structured context available';
        }

        const preview = keys.slice(0, 3).map(formatLabel).join(', ');
        return keys.length > 3 ? `${preview}, and ${keys.length - 3} more` : preview;
    }

    return 'Not provided';
}

function renderText(value: string | null | undefined): string {
    return value?.trim() || 'Not recorded yet.';
}

function renderList(values: string[] | null | undefined): string[] {
    return (values ?? []).map((item) => item.trim()).filter(Boolean);
}

interface DocumentSectionProps {
    title: string;
    description: string;
    body: string | string[];
}

function DocumentSection({ title, description, body }: DocumentSectionProps) {
    const isList = Array.isArray(body);

    return (
        <section className="space-y-3 p-6">
            <div className="space-y-1">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
            </div>

            {isList ? (
                body.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-gray-800">
                        {body.map((item, index) => (
                            <li key={`${title}-${index}`}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">Not recorded yet.</p>
                )
            ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{body}</p>
            )}
        </section>
    );
}

interface LessonPlanSectionsProps {
    lessonPlan: LessonPlan;
}

export function LessonPlanSections({ lessonPlan }: LessonPlanSectionsProps) {
    const contextEntries = Object.entries(lessonPlan.generated_context ?? {});

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden p-0">
                <div className="divide-y divide-gray-100">
                    <DocumentSection
                        title="Objectives"
                        description="What learners should achieve"
                        body={renderList(lessonPlan.objectives)}
                    />
                    <DocumentSection
                        title="Prior Knowledge"
                        description="What learners already know"
                        body={renderText(lessonPlan.prior_knowledge)}
                    />
                    <DocumentSection
                        title="Learning Resources"
                        description="Resources"
                        body={renderList(lessonPlan.learning_resources)}
                    />
                    <DocumentSection
                        title="Introduction"
                        description="Starter"
                        body={renderText(lessonPlan.introduction)}
                    />
                    <DocumentSection
                        title="Lesson Development"
                        description="Lesson flow"
                        body={renderText(lessonPlan.lesson_development)}
                    />
                    <DocumentSection
                        title="Learner Activities"
                        description="Learner tasks"
                        body={renderText(lessonPlan.learner_activities)}
                    />
                    <DocumentSection
                        title="Assessment Strategy"
                        description="How understanding will be checked"
                        body={renderText(lessonPlan.assessment_strategy)}
                    />
                    <DocumentSection
                        title="Differentiation"
                        description="Support and extension"
                        body={renderText(lessonPlan.differentiation)}
                    />
                    <DocumentSection
                        title="Conclusion"
                        description="Wrap-up"
                        body={renderText(lessonPlan.conclusion)}
                    />
                    <DocumentSection
                        title="Reflection"
                        description="Reflection after teaching"
                        body={renderText(lessonPlan.reflection)}
                    />
                </div>
            </Card>

            <Card>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Planning Notes</h2>
                        <p className="text-sm text-gray-500">
                            Supporting details saved with this lesson plan.
                        </p>
                    </div>

                    {contextEntries.length === 0 ? (
                        <p className="text-sm text-gray-500">No extra planning notes were saved for this lesson plan.</p>
                    ) : (
                        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {contextEntries.map(([key, value]) => (
                                <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {formatLabel(key)}
                                    </dt>
                                    <dd className="mt-2 text-sm leading-6 text-gray-800">
                                        {formatContextValue(value)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
            </Card>
        </div>
    );
}

import { Card } from '@/app/components/ui/Card';
import type { LessonPlan } from '@/app/core/types/lessonPlans';
import { getStructuredLessonDraft } from '@/app/core/lib/lessonPlanGeneration';

function renderText(value: string | null | undefined): string {
    return value?.trim() || 'Not recorded yet.';
}

function renderList(values: string[] | null | undefined): string[] {
    return (values ?? []).map((item) => item.trim()).filter(Boolean);
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return 'Not set';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Not set';
    }

    return parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTime(value: string | null | undefined): string {
    if (!value) {
        return 'Not set';
    }

    const [hours = '0', minutes = '0'] = value.split(':');
    const parsed = new Date();
    parsed.setHours(Number(hours), Number(minutes), 0, 0);

    if (Number.isNaN(parsed.getTime())) {
        return 'Not set';
    }

    return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatPlannedDateTime(lessonPlan: LessonPlan): string {
    const dateLabel = formatDate(lessonPlan.planned_date);
    const hasPlannedTime = lessonPlan.planned_start_time || lessonPlan.planned_end_time;

    if (!lessonPlan.planned_date && !hasPlannedTime) {
        return 'Not set';
    }

    if (!hasPlannedTime) {
        return dateLabel;
    }

    return `${dateLabel} · ${formatTime(lessonPlan.planned_start_time)} - ${formatTime(lessonPlan.planned_end_time)}`;
}

function formatScheduledSession(lessonPlan: LessonPlan): string {
    if (lessonPlan.session_title?.trim()) {
        if (lessonPlan.session_date) {
            return `${lessonPlan.session_title} (${formatDate(lessonPlan.session_date)})`;
        }
        return lessonPlan.session_title;
    }

    if (lessonPlan.session) {
        return `Lesson ${lessonPlan.session}`;
    }

    return 'Not scheduled yet';
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

function BulletList({ values }: { values: string[] }) {
    return values.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-gray-800">
            {values.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
            ))}
        </ul>
    ) : (
        <p className="text-sm text-gray-500">Not recorded yet.</p>
    );
}

function StructuredLessonDraftSections({ lessonPlan }: { lessonPlan: LessonPlan }) {
    const draft = getStructuredLessonDraft(lessonPlan);
    if (!draft) {
        return null;
    }

    return (
        <Card className="overflow-hidden p-0">
            <div className="divide-y divide-gray-100">
                <DocumentSection
                    title="Objectives"
                    description="Grounded in selected learning outcomes"
                    body={draft.objectives.map((objective) => objective.text)}
                />
                <DocumentSection
                    title="Prior Knowledge"
                    description="What learners already know"
                    body={renderText(draft.prior_knowledge)}
                />
                <DocumentSection
                    title="Learning Resources"
                    description="Teacher-selected resources"
                    body={draft.learning_resources}
                />
                {draft.phases.map((phase, index) => (
                    <section key={`${phase.phase_type}-${index}`} className="space-y-4 p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold text-gray-900">
                                    {phase.phase_type.replaceAll('_', ' ')}
                                </h2>
                                <p className="text-sm text-gray-500">{phase.title || 'Lesson phase'}</p>
                            </div>
                            {phase.duration_minutes > 0 ? (
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                    {phase.duration_minutes} min
                                </span>
                            ) : null}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Teacher actions</h3>
                                <BulletList values={phase.teacher_actions} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Learner actions</h3>
                                <BulletList values={phase.learner_actions} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Resources</h3>
                                <BulletList values={phase.resources} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Assessment / evidence</h3>
                                <BulletList values={[...phase.assessment_checks, ...phase.evidence_expected]} />
                            </div>
                        </div>
                    </section>
                ))}
                <section className="space-y-4 p-6">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Differentiation</h2>
                        <p className="text-sm text-gray-500">Support and extension</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Support</h3>
                            <BulletList values={draft.differentiation.support} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Extension</h3>
                            <BulletList values={draft.differentiation.extension} />
                        </div>
                    </div>
                </section>
                <section className="space-y-4 p-6">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Conclusion</h2>
                        <p className="text-sm text-gray-500">Closure and exit evidence</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Teacher actions</h3>
                            <BulletList values={draft.conclusion.teacher_actions} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Learner actions</h3>
                            <BulletList values={draft.conclusion.learner_actions} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Exit evidence</h3>
                            <BulletList values={draft.conclusion.exit_evidence} />
                        </div>
                    </div>
                </section>
            </div>
        </Card>
    );
}

function LessonContextItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {label}
            </dt>
            <dd className="mt-2 text-sm leading-6 text-gray-800">
                {value}
            </dd>
        </div>
    );
}

interface LessonPlanSectionsProps {
    lessonPlan: LessonPlan;
}

export function LessonPlanSections({ lessonPlan }: LessonPlanSectionsProps) {
    const selectedReferenceCount = Array.isArray(lessonPlan.selected_references)
        ? lessonPlan.selected_references.length
        : 0;

    const structuredDraft = getStructuredLessonDraft(lessonPlan);

    const lessonContextItems = [
        { label: 'Class Subject', value: lessonPlan.cohort_subject_name || 'Not set' },
        { label: 'Subject', value: lessonPlan.subject_name || 'Not set' },
        { label: 'Cohort', value: lessonPlan.cohort_name || 'Not set' },
        { label: 'Term', value: lessonPlan.term_name || 'Not set' },
        { label: 'Curriculum', value: lessonPlan.curriculum_name || 'Not set' },
        { label: 'Teacher', value: lessonPlan.teacher_name || 'Not set' },
        { label: 'Academic Year', value: lessonPlan.academic_year_name || 'Not set' },
        { label: 'Scheduled Session', value: formatScheduledSession(lessonPlan) },
        { label: 'Planned Date and Time', value: formatPlannedDateTime(lessonPlan) },
        {
            label: 'Selected Outcomes',
            value: `${lessonPlan.planned_outcomes.length} outcome${lessonPlan.planned_outcomes.length === 1 ? '' : 's'}`,
        },
        {
            label: 'Selected References',
            value: `${selectedReferenceCount} reference${selectedReferenceCount === 1 ? '' : 's'}`,
        },
    ];

    return (
        <div className="space-y-6">
            {structuredDraft ? (
                <StructuredLessonDraftSections lessonPlan={lessonPlan} />
            ) : (
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
                </div>
            </Card>
            )}

            <Card>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Lesson Context</h2>
                        <p className="text-sm text-gray-500">
                            Readable planning details saved with this lesson plan.
                        </p>
                    </div>

                    <dl className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {lessonContextItems.map((item) => (
                            <LessonContextItem
                                key={item.label}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </dl>
                </div>
            </Card>
        </div>
    );
}

import { Card } from '@/app/components/ui/Card';
import type { LessonPlan, LessonDraftPhase } from '@/app/core/types/lessonPlans';
import { getStructuredLessonDraft } from '@/app/core/lib/lessonPlanGeneration';

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

function uniqueText(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    values.forEach((value) => {
        const normalized = value.trim();
        const key = normalized.toLowerCase();
        if (!normalized || seen.has(key)) {
            return;
        }
        seen.add(key);
        result.push(normalized);
    });
    return result;
}

function mergeConclusionIntoPhase(phase: LessonDraftPhase, draftConclusion: {
    teacher_actions: string[];
    learner_actions: string[];
    exit_evidence: string[];
}): LessonDraftPhase {
    if (phase.phase_type.toUpperCase() !== 'CONCLUSION') {
        return phase;
    }

    return {
        ...phase,
        teacher_actions: uniqueText([...phase.teacher_actions, ...draftConclusion.teacher_actions]),
        learner_actions: uniqueText([...phase.learner_actions, ...draftConclusion.learner_actions]),
        evidence_expected: uniqueText([...phase.evidence_expected, ...draftConclusion.exit_evidence]),
    };
}

function StructuredLessonDraftSections({ lessonPlan }: { lessonPlan: LessonPlan }) {
    const draft = getStructuredLessonDraft(lessonPlan);
    if (!draft) {
        return null;
    }

    const hasConclusionPhase = draft.phases.some(
        (phase) => phase.phase_type.toUpperCase() === 'CONCLUSION',
    );
    const phases = draft.phases.map((phase) => mergeConclusionIntoPhase(phase, draft.conclusion));

    return (
        <Card className="overflow-hidden p-0">
            <div className="divide-y divide-gray-100">
                <DocumentSection
                    title="Objectives"
                    description="Grounded in selected learning outcomes"
                    body={draft.objectives.map((objective) => objective.text)}
                />
                <DocumentSection
                    title="Prior knowledge"
                    description="What learners already know"
                    body={renderText(draft.prior_knowledge)}
                />
                <DocumentSection
                    title="Learning resources"
                    description="Teacher-selected resources"
                    body={draft.learning_resources}
                />
                {phases.map((phase, index) => (
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
                {!hasConclusionPhase ? (
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
                ) : null}
            </div>
        </Card>
    );
}

interface LessonPlanSectionsProps {
    lessonPlan: LessonPlan;
}

export function LessonPlanSections({ lessonPlan }: LessonPlanSectionsProps) {
    const structuredDraft = getStructuredLessonDraft(lessonPlan);

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
                            title="Prior knowledge"
                            description="What learners already know"
                            body={renderText(lessonPlan.prior_knowledge)}
                        />
                        <DocumentSection
                            title="Learning resources"
                            description="Resources"
                            body={renderList(lessonPlan.learning_resources)}
                        />
                        <DocumentSection
                            title="Introduction"
                            description="Starter"
                            body={renderText(lessonPlan.introduction)}
                        />
                        <DocumentSection
                            title="Development"
                            description="Lesson flow"
                            body={renderText(lessonPlan.lesson_development)}
                        />
                        <DocumentSection
                            title="Learner activities"
                            description="Learner tasks"
                            body={renderText(lessonPlan.learner_activities)}
                        />
                        <DocumentSection
                            title="Assessment strategy"
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
        </div>
    );
}

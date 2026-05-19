import { Card } from '@/app/components/ui/Card';
import type { LessonPlan } from '@/app/core/types/lessonPlans';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringValue(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function getKeywords(record: Record<string, unknown>): string[] {
    const value = record.keywords;

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
}

function getPageRange(record: Record<string, unknown>): string | null {
    const directValue = getStringValue(record, ['page_range', 'pages', 'pageRange']);

    if (directValue) {
        return directValue;
    }

    const pageStart = record.page_start ?? record.start_page ?? record.page_from;
    const pageEnd = record.page_end ?? record.end_page ?? record.page_to;

    if (typeof pageStart === 'number' && typeof pageEnd === 'number') {
        return `${pageStart}-${pageEnd}`;
    }

    if (typeof pageStart === 'number') {
        return String(pageStart);
    }

    return null;
}

function formatFallback(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(formatFallback).join(', ');
    }

    if (isRecord(value)) {
        const serialized = JSON.stringify(value);
        return serialized.length > 240 ? `${serialized.slice(0, 237)}...` : serialized;
    }

    return 'Reference';
}

function normalizeReference(reference: unknown, index: number) {
    if (!isRecord(reference)) {
        return {
            key: `reference-${index}`,
            title: `Reference ${index + 1}`,
            citation: formatFallback(reference),
            context: null as string | null,
            pageRange: null as string | null,
            notes: null as string | null,
            keywords: [] as string[],
            fallback: null as string | null,
        };
    }

    const citation = getStringValue(reference, [
        'reference_citation',
        'citation_snapshot',
        'citation',
        'formatted_citation',
        'reference',
        'display_text',
        'summary',
    ]);

    const title = getStringValue(reference, [
        'resource_title',
        'title',
        'name',
        'label',
        'entry_title',
    ]) ?? citation ?? `Reference ${index + 1}`;

    const chapter = getStringValue(reference, ['chapter']);
    const topicLabel = getStringValue(reference, ['topic_label']);
    const context = chapter && topicLabel && chapter !== topicLabel
        ? `${chapter} / ${topicLabel}`
        : (chapter ?? topicLabel);

    const pageRange = getPageRange(reference);
    const notes = getStringValue(reference, ['notes']);
    const keywords = getKeywords(reference);
    const key =
        getStringValue(reference, ['id', 'uuid', 'slug']) ??
        `${title}-${index}`;

    const hasStructuredContent = Boolean(
        citation ||
        getStringValue(reference, ['citation_snapshot', 'reference_citation']) ||
        getStringValue(reference, ['resource_title']) ||
        context ||
        pageRange ||
        notes ||
        keywords.length > 0
    );

    return {
        key,
        title,
        citation,
        context,
        pageRange,
        notes,
        keywords,
        fallback: hasStructuredContent ? null : formatFallback(reference),
    };
}

interface LessonPlanReferencesProps {
    lessonPlan: LessonPlan;
}

export function LessonPlanReferences({ lessonPlan }: LessonPlanReferencesProps) {
    const selectedReferences = Array.isArray(lessonPlan.selected_references)
        ? lessonPlan.selected_references
        : [];
    const snapshotReferences = Array.isArray(lessonPlan.references_snapshot)
        ? lessonPlan.references_snapshot
        : [];
    const usingSnapshot = selectedReferences.length === 0 && snapshotReferences.length > 0;
    const references = (selectedReferences.length > 0
        ? selectedReferences
        : snapshotReferences).map(normalizeReference);

    return (
        <Card>
            <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Selected References</h2>
                        <p className="text-sm text-gray-500">
                            {usingSnapshot
                                ? 'Showing the stored reference snapshot because no explicit selected references were attached.'
                                : 'Reference materials attached to this lesson plan.'}
                        </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {references.length} reference{references.length === 1 ? '' : 's'}
                    </span>
                </div>

                {references.length === 0 ? (
                    <p className="text-sm text-gray-500">No reference materials were attached to this lesson plan.</p>
                ) : (
                    <div className="space-y-3">
                        {references.map((reference) => (
                            <div key={reference.key} className="rounded-lg border border-gray-200 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-gray-900">{reference.title}</h3>
                                        {reference.context ? (
                                            <p className="text-sm text-gray-600">{reference.context}</p>
                                        ) : null}
                                        {reference.citation && reference.citation !== reference.title ? (
                                            <p className="text-sm leading-6 text-gray-700">{reference.citation}</p>
                                        ) : null}
                                        {reference.notes ? (
                                            <p className="text-sm leading-6 text-gray-700">{reference.notes}</p>
                                        ) : null}
                                        {reference.keywords.length > 0 ? (
                                            <p className="text-xs text-gray-500">
                                                Keywords: {reference.keywords.join(', ')}
                                            </p>
                                        ) : null}
                                        {reference.fallback ? (
                                            <p className="text-sm leading-6 text-gray-700">{reference.fallback}</p>
                                        ) : null}
                                    </div>

                                    {reference.pageRange ? (
                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                            Pages {reference.pageRange}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}

import type {
    LessonPlanReferenceRecord,
    PlannedOutcome,
    ReferencePageInput,
    ReferencePagePayload,
} from '@/app/core/types/lessonPlans';

export function hasPositiveInteger(value: number | ''): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function emptyReferencePage(): ReferencePageInput {
    return {
        resource_title: '',
        author: '',
        publisher: '',
        edition: '',
        year: null,
        resource_type: '',
        chapter: '',
        topic_label: '',
        page_start: '',
        page_end: '',
        notes: '',
        keywords: [],
        strand_id: null,
        strand_name: '',
        sub_strand_id: null,
        sub_strand_name: '',
        outcome_id: null,
        outcome_code: '',
    };
}

export function referenceRecordToInput(
    reference: LessonPlanReferenceRecord,
): ReferencePageInput {
    return {
        resource_title: reference.resource_title ?? '',
        author: reference.author ?? '',
        publisher: reference.publisher ?? '',
        edition: reference.edition ?? '',
        year: reference.year ?? null,
        resource_type: reference.resource_type ?? '',
        chapter: reference.chapter ?? '',
        topic_label: reference.topic_label ?? '',
        page_start: Number.isInteger(reference.page_start) ? reference.page_start : '',
        page_end: Number.isInteger(reference.page_end) ? reference.page_end : '',
        notes: reference.notes ?? '',
        keywords: reference.keywords ?? [],
        strand_id: reference.strand_id ?? null,
        strand_name: reference.strand_name ?? '',
        sub_strand_id: reference.sub_strand_id ?? null,
        sub_strand_name: reference.sub_strand_name ?? '',
        outcome_id: reference.outcome_id ?? null,
        outcome_code: reference.outcome_code ?? '',
    };
}

export function isReferencePageStarted(reference: ReferencePageInput): boolean {
    return (
        reference.resource_title.trim().length > 0
        || Boolean(reference.chapter?.trim())
        || Boolean(reference.notes?.trim())
        || reference.page_start !== ''
        || reference.page_end !== ''
        || Boolean(reference.outcome_id)
    );
}

export function normalizeReferencePage(
    reference: ReferencePageInput,
    plannedOutcomes: Map<number, PlannedOutcome>,
): ReferencePageInput {
    const selectedOutcome = reference.outcome_id
        ? plannedOutcomes.get(reference.outcome_id)
        : undefined;

    return {
        ...reference,
        resource_title: reference.resource_title.trim(),
        author: reference.author?.trim() || '',
        publisher: reference.publisher?.trim() || '',
        edition: reference.edition?.trim() || '',
        chapter: reference.chapter?.trim() || '',
        topic_label: (
            reference.topic_label?.trim()
            || reference.sub_strand_name?.trim()
            || selectedOutcome?.sub_strand
            || selectedOutcome?.text
            || ''
        ),
        notes: reference.notes?.trim() || '',
        keywords: reference.keywords ?? [],
        strand_name: reference.strand_name?.trim() || selectedOutcome?.strand || '',
        sub_strand_name: reference.sub_strand_name?.trim() || selectedOutcome?.sub_strand || '',
        outcome_code: reference.outcome_code?.trim() || selectedOutcome?.code || '',
        strand_id: reference.strand_id ?? selectedOutcome?.strand_id ?? null,
        sub_strand_id: reference.sub_strand_id ?? selectedOutcome?.sub_strand_id ?? null,
        outcome_id: reference.outcome_id ?? null,
        year: reference.year ?? null,
        resource_type: reference.resource_type?.trim() || '',
    };
}

export function validateReferencePages(
    references: ReferencePageInput[],
    plannedOutcomes: Map<number, PlannedOutcome>,
    options?: {
        requireAtLeastOne?: boolean;
    },
): {
    error: string | null;
    payload: ReferencePagePayload[];
} {
    const payload: ReferencePagePayload[] = [];
    const startedReferences = references
        .map((reference) => normalizeReferencePage(reference, plannedOutcomes))
        .filter(isReferencePageStarted);

    if (startedReferences.length === 0) {
        if (options?.requireAtLeastOne) {
            return {
                error: 'Add at least one book page before generating the lesson plan.',
                payload: [],
            };
        }

        return {
            error: null,
            payload: [],
        };
    }

    for (const [index, reference] of startedReferences.entries()) {
        const referenceLabel = `Reference ${index + 1}`;

        if (!reference.resource_title) {
            return {
                error: `${referenceLabel}: enter a resource title.`,
                payload: [],
            };
        }

        if (!reference.outcome_id) {
            return {
                error: `${referenceLabel}: choose a learning outcome.`,
                payload: [],
            };
        }

        if (!plannedOutcomes.has(reference.outcome_id)) {
            return {
                error: `${referenceLabel}: choose a learning outcome from this lesson plan.`,
                payload: [],
            };
        }

        if (!hasPositiveInteger(reference.page_start)) {
            return {
                error: `${referenceLabel}: page start must be a positive whole number.`,
                payload: [],
            };
        }

        if (!hasPositiveInteger(reference.page_end)) {
            return {
                error: `${referenceLabel}: page end must be a positive whole number.`,
                payload: [],
            };
        }

        if (reference.page_end < reference.page_start) {
            return {
                error: `${referenceLabel}: page end must be greater than or equal to page start.`,
                payload: [],
            };
        }

        payload.push({
            ...reference,
            resource_type: reference.resource_type || undefined,
            page_start: reference.page_start,
            page_end: reference.page_end,
        });
    }

    return {
        error: null,
        payload,
    };
}

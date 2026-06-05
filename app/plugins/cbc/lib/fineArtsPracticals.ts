import type { Term } from '@/app/core/types/academic';
import type {
    FineArtsPracticalContract,
    SessionPracticalContext,
} from '@/app/core/types/session';
import type { PlannedOutcome } from '@/app/core/types/lessonPlans';

const CBC_CURRICULUM_TYPES = new Set(['CBE', 'CBC']);
const FINE_ARTS_SUBJECT_CODE = 'FINEARTS';
const FINE_ARTS_SUBJECT_NAME = 'fine arts';

function normalizeValue(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function isFineArtsSubject(subject: {
    subject_code?: string | null;
    subject_name?: string | null;
}): boolean {
    return (
        normalizeValue(subject.subject_code) === normalizeValue(FINE_ARTS_SUBJECT_CODE)
        || normalizeValue(subject.subject_name) === FINE_ARTS_SUBJECT_NAME
    );
}

export function isCbcFineArtsPracticalSession(session: {
    curriculum_type?: string | null;
    session_type?: string | null;
    subject_code?: string | null;
    subject_name?: string | null;
} | null | undefined): boolean {
    if (!session) {
        return false;
    }

    return (
        CBC_CURRICULUM_TYPES.has(String(session.curriculum_type ?? '').toUpperCase())
        && String(session.session_type ?? '').toUpperCase() === 'PRACTICAL'
        && isFineArtsSubject(session)
    );
}

export function isCbcFineArtsLessonPlanPractical(context: {
    sessionType?: string | null;
    subjectName?: string | null;
    plannedOutcomes?: PlannedOutcome[] | null;
}): boolean {
    if (String(context.sessionType ?? '').toUpperCase() !== 'PRACTICAL') {
        return false;
    }

    if (normalizeValue(context.subjectName) !== FINE_ARTS_SUBJECT_NAME) {
        return false;
    }

    return (context.plannedOutcomes ?? []).some((outcome) => outcome.plugin === 'cbc');
}

export function buildFineArtsPracticalContext(
    courseworkTaskId?: number | null,
    taskCode?: string | null,
): SessionPracticalContext | undefined {
    if (!courseworkTaskId && !String(taskCode ?? '').trim()) {
        return undefined;
    }

    return {
        family: 'FINE_ARTS',
        ...(courseworkTaskId ? { coursework_task_id: courseworkTaskId } : {}),
        ...(String(taskCode ?? '').trim() ? { task_code: String(taskCode).trim() } : {}),
    };
}

export function resolveFineArtsTaskTermNumber(
    termId: number | null | undefined,
    terms: Pick<Term, 'id' | 'sequence'>[],
): number | undefined {
    if (!termId) {
        return undefined;
    }

    return terms.find((term) => term.id === termId)?.sequence;
}

export function buildFineArtsPracticalWorkflowHref(
    sessionId: number,
    returnTo?: string | null,
): string {
    const searchParams = new URLSearchParams({
        action: 'record-evidence',
        notice: 'closure-evidence-required',
    });

    if (returnTo) {
        searchParams.set('returnTo', returnTo);
    }

    return `/cbc/teaching/sessions/${sessionId}/fine-arts-practical?${searchParams.toString()}`;
}

export function hasResolvedFineArtsPracticalContract(
    contract: FineArtsPracticalContract | null | undefined,
): boolean {
    return Boolean(contract?.resolved && contract.coursework_task);
}

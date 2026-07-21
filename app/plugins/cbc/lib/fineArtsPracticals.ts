import type { Term } from '@/app/core/types/academic';
import type {
    FineArtsEvidenceType,
    FineArtsLearnerEvidenceLearner,
    FineArtsPracticalContract,
    SessionPracticalContext,
} from '@/app/core/types/session';
import type { PlannedOutcome } from '@/app/core/types/lessonPlans';
import { parseAppDestination } from '@/app/core/auth/navigation';

const CBC_CURRICULUM_TYPES = new Set(['CBE', 'CBC']);
const FINE_ARTS_SUBJECT_CODE = 'FINEARTS';
const FINE_ARTS_SUBJECT_NAME = 'fine arts';

export const FINE_ARTS_LEARNER_WORKSHEET_EVIDENCE_TYPES: FineArtsEvidenceType[] = [
    'PROCESS_JOURNAL',
    'RESEARCH_WRITEUP',
    'FINISHED_ARTWORK',
    'ORAL_PRESENTATION',
    'PORTFOLIO_ENTRY',
    'SKETCH',
    'MATERIAL_EXPERIMENTATION',
    'SELF_ASSESSMENT',
    'PEER_CRITIQUE',
    'EXHIBITION_RECORD',
];

export interface FineArtsWorksheetUiState {
    activeSection?: 'proof' | 'learner';
    search?: string;
    learnerId?: number | null;
    evidenceType?: FineArtsEvidenceType | null;
}

function normalizeValue(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function formatFineArtsEvidenceLabel(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function firstPendingEvidenceType(
    learner: FineArtsLearnerEvidenceLearner | null | undefined,
    evidenceTypes: FineArtsEvidenceType[],
): FineArtsEvidenceType | null {
    if (!learner) {
        return evidenceTypes[0] ?? null;
    }

    return evidenceTypes.find((evidenceType) => !learner.evidence[evidenceType]?.recorded)
        ?? evidenceTypes[0]
        ?? null;
}

export function getFineArtsWorksheetStorageKey(sessionId: number): string {
    return `fine-arts-worksheet:${sessionId}`;
}

export function filterFineArtsLearners(
    learners: FineArtsLearnerEvidenceLearner[],
    search: string,
): FineArtsLearnerEvidenceLearner[] {
    const normalizedSearch = normalizeValue(search);
    if (!normalizedSearch) {
        return learners;
    }

    return learners.filter((learner) => (
        normalizeValue(learner.name).includes(normalizedSearch)
        || normalizeValue(learner.admission_number).includes(normalizedSearch)
    ));
}

export function sanitizeFineArtsWorksheetUiState(params: {
    state?: FineArtsWorksheetUiState | null;
    learners: FineArtsLearnerEvidenceLearner[];
    evidenceTypes: FineArtsEvidenceType[];
    fallbackActiveSection?: 'proof' | 'learner';
}): Required<FineArtsWorksheetUiState> {
    const fallbackActiveSection = params.fallbackActiveSection ?? 'proof';
    const search = String(params.state?.search ?? '');
    const activeSection = params.state?.activeSection === 'learner' ? 'learner' : fallbackActiveSection;
    const learnerMap = new Map(params.learners.map((learner) => [learner.learner_id, learner]));
    const savedLearnerId = typeof params.state?.learnerId === 'number' ? params.state.learnerId : null;
    const learnerId = savedLearnerId && learnerMap.has(savedLearnerId)
        ? savedLearnerId
        : (params.learners[0]?.learner_id ?? null);
    const selectedLearner = learnerId ? learnerMap.get(learnerId) ?? null : null;
    const savedEvidenceType = params.state?.evidenceType ?? null;
    const evidenceType = (
        savedEvidenceType
        && params.evidenceTypes.includes(savedEvidenceType)
        && selectedLearner?.evidence[savedEvidenceType]
    )
        ? savedEvidenceType
        : firstPendingEvidenceType(selectedLearner, params.evidenceTypes);

    return {
        activeSection,
        search,
        learnerId,
        evidenceType,
    };
}

export function getNextFineArtsWorksheetTarget(params: {
    learners: FineArtsLearnerEvidenceLearner[];
    currentLearnerId: number | null;
    currentEvidenceType: FineArtsEvidenceType | null;
    evidenceTypes: FineArtsEvidenceType[];
    preferredEvidenceTypes?: FineArtsEvidenceType[];
}): { learnerId: number; evidenceType: FineArtsEvidenceType } | null {
    if (params.learners.length === 0 || params.evidenceTypes.length === 0) {
        return null;
    }

    const cycleEvidenceTypes = params.preferredEvidenceTypes?.length
        ? params.preferredEvidenceTypes
        : params.evidenceTypes;
    const learnerIndex = params.learners.findIndex((learner) => learner.learner_id === params.currentLearnerId);
    const orderedLearners = learnerIndex >= 0
        ? [...params.learners.slice(learnerIndex + 1), ...params.learners.slice(0, learnerIndex + 1)]
        : params.learners;

    for (const learner of orderedLearners) {
        const nextEvidenceType = cycleEvidenceTypes.find((evidenceType) => !learner.evidence[evidenceType]?.recorded);
        if (nextEvidenceType) {
            return {
                learnerId: learner.learner_id,
                evidenceType: nextEvidenceType,
            };
        }
    }

    const fallbackLearner = params.learners.find((learner) => learner.learner_id === params.currentLearnerId)
        ?? params.learners[0];
    const fallbackEvidenceType = params.currentEvidenceType
        && params.evidenceTypes.includes(params.currentEvidenceType)
        ? params.currentEvidenceType
        : params.evidenceTypes[0];

    return fallbackLearner && fallbackEvidenceType
        ? {
            learnerId: fallbackLearner.learner_id,
            evidenceType: fallbackEvidenceType,
        }
        : null;
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

    const safeReturnTo = parseAppDestination(returnTo);
    if (safeReturnTo) {
        searchParams.set('returnTo', safeReturnTo);
    }

    return `/cbc/teaching/sessions/${sessionId}/practical?${searchParams.toString()}`;
}

export function hasResolvedFineArtsPracticalContract(
    contract: FineArtsPracticalContract | null | undefined,
): boolean {
    return Boolean(contract?.resolved && contract.coursework_task);
}

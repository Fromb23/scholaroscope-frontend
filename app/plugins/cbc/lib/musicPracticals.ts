import type {
    MusicEvidenceCategory,
    MusicEvidenceType,
    MusicPracticalLearnerRow,
} from '@/app/core/types/session';

const CBC_CURRICULUM_TYPES = new Set(['CBE', 'CBC']);
const MUSIC_SUBJECT_CODE = 'MUSIC';
const MUSIC_SUBJECT_NAME = 'music';

export const MUSIC_PRACTICAL_EVIDENCE_TYPES: MusicEvidenceType[] = [
    'REHEARSAL_LOG',
    'PERFORMANCE_RECORDING',
    'VOCAL_TECHNIQUE',
    'INSTRUMENTAL_TECHNIQUE',
    'RHYTHM_ACCURACY',
    'PITCH_ACCURACY',
    'EXPRESSION_INTERPRETATION',
    'ENSEMBLE_PARTICIPATION',
    'COMPOSITION_OR_ARRANGEMENT',
    'NOTATION_OR_SCORE',
    'LISTENING_RESPONSE',
    'SELF_ASSESSMENT',
    'PEER_FEEDBACK',
    'TEACHER_OBSERVATION',
    'PORTFOLIO_ENTRY',
];

export const MUSIC_PRACTICAL_MATRIX_COLUMNS: MusicEvidenceCategory[] = [
    'performance',
    'technique',
    'rhythm_pitch',
    'expression',
    'notation',
    'reflection',
];

function normalizeValue(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function isMusicSubject(subject: {
    subject_code?: string | null;
    subject_name?: string | null;
}): boolean {
    return (
        normalizeValue(subject.subject_code) === normalizeValue(MUSIC_SUBJECT_CODE)
        || normalizeValue(subject.subject_name) === normalizeValue(MUSIC_SUBJECT_NAME)
    );
}

export function isCbcMusicPracticalSession(session: {
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
        && isMusicSubject(session)
    );
}

export function formatMusicEvidenceLabel(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getMusicEvidenceCategoryLabel(category: MusicEvidenceCategory): string {
    switch (category) {
        case 'rhythm_pitch':
            return 'Rhythm / Pitch';
        default:
            return formatMusicEvidenceLabel(category);
    }
}

export function filterMusicLearners(
    learners: MusicPracticalLearnerRow[],
    search: string,
): MusicPracticalLearnerRow[] {
    const normalizedSearch = normalizeValue(search);
    if (!normalizedSearch) {
        return learners;
    }

    return learners.filter((learner) => (
        normalizeValue(learner.name).includes(normalizedSearch)
        || normalizeValue(learner.admission_number).includes(normalizedSearch)
    ));
}

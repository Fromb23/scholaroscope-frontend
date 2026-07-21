import type {
    PracticalProfileFamily,
    PracticalProfileKey,
    Session,
} from '@/app/core/types/session';
import {
    buildFineArtsPracticalWorkflowHref,
    isCbcFineArtsPracticalSession,
} from './fineArtsPracticals';
import { isCbcMusicPracticalSession } from './musicPracticals';
import { parseAppDestination } from '@/app/core/auth/navigation';

export interface PracticalProfileDefinition {
    key: PracticalProfileKey;
    family: PracticalProfileFamily;
    label: string;
    description: string;
    matchesSession: (session: Pick<Session, 'curriculum_type' | 'session_type' | 'subject_code' | 'subject_name'> | null | undefined) => boolean;
}

const PRACTICAL_PROFILES: PracticalProfileDefinition[] = [
    {
        key: 'FINE_ARTS',
        family: 'FINE_ARTS',
        label: 'Fine Arts Practical',
        description: 'Resolve the official coursework task, confirm outcomes, and complete the learner worksheet evidence.',
        matchesSession: isCbcFineArtsPracticalSession,
    },
    {
        key: 'MUSIC',
        family: 'MUSIC',
        label: 'Music Practical',
        description: 'Resolve the practical task, confirm outcomes, and record learner performance evidence before closing the session.',
        matchesSession: isCbcMusicPracticalSession,
    },
];

export function getPracticalProfiles(): PracticalProfileDefinition[] {
    return PRACTICAL_PROFILES;
}

export function getPracticalProfileByKey(
    key: PracticalProfileKey | null | undefined,
): PracticalProfileDefinition | null {
    return PRACTICAL_PROFILES.find((profile) => profile.key === key) ?? null;
}

export function resolvePracticalProfileFromSession(
    session: Pick<Session, 'curriculum_type' | 'session_type' | 'subject_code' | 'subject_name'> | null | undefined,
): PracticalProfileDefinition | null {
    if (!session) {
        return null;
    }

    return PRACTICAL_PROFILES.find((profile) => profile.matchesSession(session)) ?? null;
}

export function buildPracticalWorkflowHref(
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

export { buildFineArtsPracticalWorkflowHref };

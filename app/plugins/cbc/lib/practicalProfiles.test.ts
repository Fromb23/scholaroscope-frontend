import { describe, expect, it } from 'vitest';

import { buildPracticalWorkflowHref, resolvePracticalProfileFromSession } from './practicalProfiles';

describe('cbc practical profiles', () => {
    it('resolves Fine Arts practical sessions to the Fine Arts profile', () => {
        const profile = resolvePracticalProfileFromSession({
            curriculum_type: 'CBE',
            session_type: 'PRACTICAL',
            subject_code: 'FINEARTS',
            subject_name: 'Fine Arts',
        });

        expect(profile?.key).toBe('FINE_ARTS');
    });

    it('does not treat normal Music sessions as practical sessions', () => {
        const profile = resolvePracticalProfileFromSession({
            curriculum_type: 'CBE',
            session_type: 'LESSON',
            subject_code: 'MUSIC',
            subject_name: 'Music',
        });

        expect(profile).toBeNull();
    });

    it('resolves Music practical sessions to the Music profile', () => {
        const profile = resolvePracticalProfileFromSession({
            curriculum_type: 'CBE',
            session_type: 'PRACTICAL',
            subject_code: 'MUSIC',
            subject_name: 'Music',
        });

        expect(profile?.key).toBe('MUSIC');
    });

    it('builds the shared practical workflow route', () => {
        expect(buildPracticalWorkflowHref(42, '/sessions/42?section=complete')).toBe(
            '/cbc/teaching/sessions/42/practical?action=record-evidence&notice=closure-evidence-required&returnTo=%2Fsessions%2F42%3Fsection%3Dcomplete',
        );
    });
});

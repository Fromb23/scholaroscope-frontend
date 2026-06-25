import { describe, expect, it } from 'vitest';

import {
    buildAcademicSetupRedirectHref,
    getAcademicSetupCurrentStepNavItem,
    getAcademicSetupDisplayLabel,
    getAcademicSetupPageState,
    isAcademicSetupAdminPath,
    isAcademicSetupOperationalAdminPath,
    resolveAcademicSetupOrigin,
    withAcademicSetupMode,
} from './academicSetup';
import type { AcademicSetupStatus } from '@/app/core/types/academic';

const incompleteStatus: AcademicSetupStatus = {
    complete: false,
    current_step: 'ACADEMIC_YEAR',
    current_step_label: 'Create current academic year',
    current_step_description: 'Add the current academic year before operational work unlocks.',
    next_action: {
        label: 'Create current academic year',
        href: '/academic/years?create=1',
    },
    steps: [
        { key: 'CURRICULUM', label: 'Choose curriculum', status: 'complete', href: '/admin/settings?tab=plugins&from=academic-setup', description: 'Choose the curriculum first.' },
        { key: 'ACADEMIC_YEAR', label: 'Create current academic year', status: 'current', href: '/academic/years?setup=1&create=1', description: 'Create the current academic year.' },
        { key: 'TERMS', label: 'Set up terms', status: 'locked', href: '/academic/terms?setup=1', description: 'Create terms for the current year.' },
        { key: 'SUBJECTS', label: 'Add or confirm subjects', status: 'locked', href: '/academic/subjects?setup=1', description: 'Add or confirm subjects.' },
        { key: 'COHORTS', label: 'Create cohorts/classes', status: 'locked', href: '/academic/cohorts?setup=1&create=1', description: 'Create current-year cohorts.' },
    ],
    locked_until_complete: ['sessions'],
    has_active_curriculum: true,
    has_current_academic_year: false,
    has_terms_for_current_academic_year: false,
    has_active_or_configured_term: false,
    has_subjects: false,
    has_cohorts_for_current_academic_year: false,
    current_academic_year_id: null,
    counts: {
        curricula: 1,
        academic_years: 0,
        terms: 0,
        subjects: 0,
        cohorts: 0,
    },
};

describe('academic setup helpers', () => {
    it('computes page states from the current setup step', () => {
        expect(getAcademicSetupPageState(incompleteStatus, 'CURRICULUM')).toBe('completed');
        expect(getAcademicSetupPageState(incompleteStatus, 'ACADEMIC_YEAR')).toBe('current');
        expect(getAcademicSetupPageState(incompleteStatus, 'TERMS')).toBe('blocked');
    });

    it('builds blocked redirects with setup mode and return target', () => {
        expect(buildAcademicSetupRedirectHref(incompleteStatus, '/sessions/12')).toBe(
            '/academic/years?create=1&setup=1&blocked=1&returnTo=%2Fsessions%2F12',
        );
    });

    it('adds setup mode to continuation links without dropping existing params', () => {
        expect(withAcademicSetupMode('/academic/cohorts?create=1')).toBe('/academic/cohorts?create=1&setup=1');
    });

    it('uses frontend display labels for setup steps that changed copy', () => {
        expect(getAcademicSetupDisplayLabel('ACADEMIC_YEAR', 'Create current academic year')).toBe('Set up academic year');
        expect(getAcademicSetupCurrentStepNavItem(incompleteStatus)).toEqual({
            label: 'Set up academic year',
            href: '/academic/years?create=1&setup=1',
        });
    });

    it('flags operational admin paths that should be gated during setup', () => {
        expect(isAcademicSetupOperationalAdminPath('/sessions/12')).toBe(true);
        expect(isAcademicSetupOperationalAdminPath('/learners')).toBe(true);
        expect(isAcademicSetupOperationalAdminPath('/lesson-plans')).toBe(true);
        expect(isAcademicSetupOperationalAdminPath('/assessments')).toBe(true);
        expect(isAcademicSetupOperationalAdminPath('/reports')).toBe(true);
        expect(isAcademicSetupOperationalAdminPath('/schemes')).toBe(true);
        expect(isAcademicSetupOperationalAdminPath('/cbc/classes')).toBe(true);
    });

    it('does not treat academic setup pages as operationally locked paths', () => {
        expect(isAcademicSetupOperationalAdminPath('/academic')).toBe(false);
        expect(isAcademicSetupOperationalAdminPath('/academic/curricula')).toBe(false);
        expect(isAcademicSetupOperationalAdminPath('/academic/years')).toBe(false);
        expect(isAcademicSetupOperationalAdminPath('/academic/terms')).toBe(false);
        expect(isAcademicSetupOperationalAdminPath('/academic/subjects')).toBe(false);
        expect(isAcademicSetupOperationalAdminPath('/academic/cohorts')).toBe(false);
    });

    it('identifies academic setup pages for visible setup access states', () => {
        expect(isAcademicSetupAdminPath('/academic')).toBe(true);
        expect(isAcademicSetupAdminPath('/academic/curricula')).toBe(true);
        expect(isAcademicSetupAdminPath('/academic/years')).toBe(true);
        expect(isAcademicSetupAdminPath('/academic/terms')).toBe(true);
        expect(isAcademicSetupAdminPath('/academic/subjects')).toBe(true);
        expect(isAcademicSetupAdminPath('/academic/cohorts')).toBe(true);
        expect(isAcademicSetupAdminPath('/sessions')).toBe(false);
    });

    it('treats schemes of work as the guided step after cohorts', () => {
        const schemeStatus: AcademicSetupStatus = {
            ...incompleteStatus,
            current_step: 'SCHEMES_OF_WORK',
            current_step_label: 'Set up schemes of work',
            next_action: {
                label: 'Set up schemes of work',
                href: '/schemes?setup=1',
            },
            steps: [
                ...incompleteStatus.steps.map((step) => ({ ...step, status: 'complete' as const })),
                {
                    key: 'SCHEMES_OF_WORK',
                    label: 'Set up schemes of work',
                    status: 'current',
                    href: '/schemes?setup=1',
                    description: 'Create or generate schemes of work before lesson plans.',
                },
            ],
        };

        expect(getAcademicSetupPageState(schemeStatus, 'COHORTS')).toBe('completed');
        expect(getAcademicSetupPageState(schemeStatus, 'SCHEMES_OF_WORK')).toBe('current');
    });

    it('keeps generic setup return targets generic', () => {
        expect(resolveAcademicSetupOrigin({
            setup: '1',
            blocked: '1',
            returnTo: '/lesson-plans',
        })).toEqual({
            kind: 'generic',
            title: 'Complete curriculum setup to continue.',
            message: 'After setup, return to the page you were working on.',
            returnLabel: 'Return to previous page',
        });
    });

    it('uses Cambridge setup copy only for explicit Cambridge setup origins', () => {
        expect(resolveAcademicSetupOrigin({
            setup: '1',
            blocked: '1',
            origin: 'cambridge',
            returnTo: '/cambridge/offerings/12',
        })).toEqual({
            kind: 'cambridge',
            title: 'Cambridge Setup Flow',
            message: 'Choose the curriculum here, then return to the Cambridge offering to assign cohorts.',
            returnLabel: 'Return to Cambridge offering',
        });
    });

    it('does not infer Cambridge from origin alone without a Cambridge return target', () => {
        expect(resolveAcademicSetupOrigin({
            setup: '1',
            blocked: '1',
            origin: 'cambridge',
            returnTo: '/lesson-plans',
        }).kind).toBe('generic');
    });
});

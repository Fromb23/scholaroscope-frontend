import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AcademicSetupProgress } from './AcademicSetupProgress';
import type { AcademicSetupStatus } from '@/app/core/types/academic';

const status: AcademicSetupStatus = {
    complete: false,
    current_step: 'SUBJECTS',
    current_step_label: 'Add or confirm subjects',
    current_step_description: 'Subjects define what can be taught.',
    next_action: {
        label: 'Add or confirm subjects',
        href: '/academic/subjects?setup=1',
    },
    steps: [
        {
            key: 'CURRICULUM',
            label: 'Choose curriculum',
            status: 'complete',
            href: '/admin/settings?tab=plugins&from=academic-setup',
            description: 'Choose the curriculum first.',
        },
        {
            key: 'ACADEMIC_YEAR',
            label: 'Create current academic year',
            status: 'complete',
            href: '/academic/years?setup=1&create=1',
            description: 'Create the current academic year.',
        },
        {
            key: 'TERMS',
            label: 'Set up terms',
            status: 'complete',
            href: '/academic/terms?setup=1',
            description: 'Create terms.',
        },
        {
            key: 'SUBJECTS',
            label: 'Add or confirm subjects',
            status: 'current',
            href: '/academic/subjects',
            description: 'Add subjects.',
        },
    ],
    locked_until_complete: ['sessions'],
    has_active_curriculum: true,
    has_current_academic_year: true,
    has_terms_for_current_academic_year: true,
    has_active_or_configured_term: true,
    has_subjects: false,
    has_cohorts_for_current_academic_year: false,
    current_academic_year_id: 1,
    counts: {
        curricula: 1,
        academic_years: 1,
        terms: 1,
        subjects: 0,
        cohorts: 0,
    },
};

describe('AcademicSetupProgress', () => {
    it('renders review and continue actions with setup links', () => {
        const html = renderToStaticMarkup(<AcademicSetupProgress status={status} />);

        expect(html).toContain('Review / adjust');
        expect(html).toContain('Continue');
        expect(html).toContain('/academic/years?setup=1&amp;create=1');
        expect(html).toContain('/academic/terms?setup=1');
        expect(html).toContain('/academic/subjects?setup=1');
    });
});

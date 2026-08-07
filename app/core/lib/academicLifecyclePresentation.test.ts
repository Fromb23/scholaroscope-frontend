import { describe, expect, it } from 'vitest';

import { resolveAcademicLifecyclePresentation } from './academicLifecyclePresentation';
import type { AcademicLifecycleContext } from '@/app/core/types/academic';

function context(overrides: Partial<AcademicLifecycleContext>): AcademicLifecycleContext {
  return {
    mode: 'TERM_ENDED',
    organization: 1,
    academic_year: null,
    message: 'The term has ended.',
    allows_new_teaching: false,
    allows_cleanup: false,
    ...overrides,
  };
}

describe('academic lifecycle presentation', () => {
  it('gives admins a direct create-next-term action when a live year has no successor term', () => {
    const presentation = resolveAcademicLifecyclePresentation(context({
      transition: {
        kind: 'CREATE_TERM',
        curriculum_id: 2,
        academic_year_id: 4,
        reason: 'The term ended and no next term is configured.',
      },
    }), 'admin');

    expect(presentation.title).toBe('Term ended');
    expect(presentation.actionLabel).toBe('Create next term');
    expect(presentation.actionHref).toBe('/academic/terms?action=create&curriculum=2&academicYear=4');
    expect(presentation.message).toContain("Your previous term has ended.");
    expect(presentation.message).toContain("Set up the next term when you're ready.");
    expect(presentation.disabledTeachingReason).toContain('active term is available');
  });

  it('tells institution instructors to contact an administrator instead of linking setup', () => {
    const presentation = resolveAcademicLifecyclePresentation(context({
      transition: {
        kind: 'CREATE_ACADEMIC_YEAR',
        curriculum_id: 2,
        academic_year_id: 4,
        reason: 'The academic year has ended.',
      },
    }), 'instructor');

    expect(presentation.actionHref).toBeNull();
    expect(presentation.message).toContain('Contact your workspace administrator to create the next academic year.');
    expect(presentation.disabledTeachingReason).toContain('academic year');
  });

  it('does not offer duplicate creation for an upcoming term', () => {
    const presentation = resolveAcademicLifecyclePresentation(context({
      mode: 'UPCOMING_TERM',
      term: {
        id: 9,
        name: 'Term 2',
        academic_year: 4,
        academic_year_name: '2026',
        sequence: 2,
        start_date: '2026-09-01',
        end_date: '2026-12-01',
        status: 'OPEN',
        is_frozen: false,
        calendar_setup_completed_at: null,
        calendar_setup_completed_by: null,
        calendar_setup_completed_by_name: '',
        calendar_setup_reopened_by_name: '',
        is_calendar_setup_complete: false,
        configuration_state: 'SETUP_OPEN',
        configuration_actions: {
          can_edit_term: true,
          can_delete_term: true,
          can_add_calendar_event: true,
          can_edit_calendar_event: true,
          can_delete_calendar_event: true,
          can_complete_setup: true,
          can_reopen_setup: false,
        },
        configuration_locked_reason: null,
        week_count: 13,
        created_at: '2026-01-01T00:00:00Z',
      },
      transition: {
        kind: 'WAIT_FOR_UPCOMING_TERM',
        term_id: 9,
        starts_on: '2026-09-01',
        reason: 'A future open term is already configured.',
      },
    }), 'admin');

    expect(presentation.actionHref).toBeNull();
    expect(presentation.message).toContain('New teaching remains paused until it starts.');
  });
});

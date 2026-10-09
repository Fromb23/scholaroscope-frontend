import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveAppError } from '@/app/core/errors';
import type { EligibleProjectTarget } from '@/app/core/types/projects';
import {
  buildRegistrationPayload,
  initialEligibleTarget,
} from './OfficialProjectRegistration';

const target = (id: number): EligibleProjectTarget => ({
  id,
  cohort: { id, name: `Grade ${id}` },
  subject: { id, name: 'Computer Studies' },
  academic_year: 2026,
  can_deploy: true,
  eligible_instructors: [],
  requires_instructor_selection: false,
});

describe('official project registration contract', () => {
  it('preselects exactly one deployable target and requires selection for multiple targets', () => {
    expect(initialEligibleTarget([target(10)])).toBe('10');
    expect(initialEligibleTarget([target(10), target(11)])).toBe('');
  });

  it('builds only the canonical registration fields and supports multi-term timestamps', () => {
    const payload = buildRegistrationPayload(
      '10',
      '2026-02-01T08:00',
      '2026-10-01T17:00',
      '22',
    );
    expect(Object.keys(payload).sort()).toEqual([
      'administering_instructor',
      'cohort_subject',
      'deadline_at',
      'starts_at',
    ]);
    expect(payload.cohort_subject).toBe(10);
    expect(new Date(payload.deadline_at).getMonth() - new Date(payload.starts_at).getMonth()).toBe(8);
  });

  it('keeps consequential registration behind confirmation and prevents duplicate submission', () => {
    const source = readFileSync(
      'app/core/components/projects/OfficialProjectRegistration.tsx',
      'utf8',
    );
    expect(source).toContain('Review registration');
    expect(source).toContain('Register and deploy');
    expect(source).toContain('submittingRef.current');
    expect(source).toContain('if (!selectedTarget || !canContinue || submittingRef.current) return');
    expect(source).toContain('disabled={fixedWindow}');
    expect(source).toContain('onEligibilityChanged');
    expect(source).toContain('activeOrg?.name');
    expect(source).toContain('buildProjectDetailHref(deployment.id, returnTo)');
  });

  it.each([
    ['project_target_not_eligible', 'Teaching target is no longer eligible.'],
    ['project_definition_not_published', 'Official project is no longer published.'],
    ['project_deployment_conflict', 'A deployment already exists.'],
    ['project_schedule_invalid', 'Project schedule is invalid.'],
    ['project_schedule_outside_official_window', 'Schedule is outside the official window.'],
    ['project_adoption_revoked', 'Institutional registration was revoked.'],
    ['project_cross_organization_target', 'Teaching target is outside this organization.'],
    ['project_deployment_transition_invalid', 'Project deployment is closed for this action.'],
  ])('maps server domain error %s to useful copy', (code, title) => {
    const error = resolveAppError(
      { response: { status: 400, data: { error: { code, message: 'Server message' } } } },
      { domain: 'projects', action: 'create' },
    );
    expect(error.title).toBe(title);
  });
});

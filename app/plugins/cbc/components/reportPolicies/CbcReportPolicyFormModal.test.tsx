import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  buildCbcReportPolicyPayload,
  CbcReportPolicyFormModal,
  mapCbcReportPolicyApiErrors,
  type CbcPolicyFormState,
} from './CbcReportPolicyFormModal';

vi.mock('@/app/plugins/cbc/api/reportPolicies', () => ({
  cbcReportPolicyAPI: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

function baseForm(overrides: Partial<CbcPolicyFormState> = {}): CbcPolicyFormState {
  return {
    name: 'Grade 7 Mathematics policy',
    description: '',
    policy_scope: 'COHORT_SUBJECT',
    subject_profile: 12,
    cohort: 9,
    cbc_cohort_subject: 41,
    term: 3,
    assessment_weights: [
      { type: 'ENTRY', weight: '30' },
      { type: 'MIDTERM', weight: '70' },
    ],
    level_scale: [
      { min: '0', max: '49', level: 'BE', code: 'BE1', label: 'Below Expectations', points: '1' },
      { min: '50', max: '100', level: 'ME', code: 'ME1', label: 'Meets Expectations', points: '4' },
    ],
    diagnostic_assessment_types: [],
    required_components: ['ENTRY', 'MIDTERM'],
    include_assignments: false,
    include_projects: false,
    include_practicals: false,
    rounding_mode: 'ROUND_HALF_UP',
    is_default: false,
    is_active: true,
    ...overrides,
  };
}

function renderModal(authoringMode: 'CLASS_SUBJECT_SETUP' | 'CLASS_SETUP' | 'INSTITUTION_GOVERNANCE') {
  return renderToStaticMarkup(
    <CbcReportPolicyFormModal
      editingPolicy={null}
      authoringMode={authoringMode}
      lockedCohortId={9}
      lockedCohortSubjectId={41}
      lockedCohortSubjectLabel="Class subject: Grade 7 · Mathematics"
      subjectProfiles={[
        { id: 12, label: 'Catalog fallback: Mathematics catalog profile (Reference only)' },
      ]}
      cohorts={[
        { id: 9, label: 'Grade 7' },
      ]}
      cohortSubjects={[
        {
          id: 41,
          label: 'Class subject: Grade 7 · Mathematics',
          cohortId: 9,
          cohortSubjectId: 26,
          subjectProfileId: 12,
        },
      ]}
      terms={[
        { id: 3, label: '2026 · Term 1' },
      ]}
      onSuccess={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('CBC report policy form modal', () => {
  it('uses class-subject setup scope selection instead of national subject profile selection', () => {
    const html = renderModal('CLASS_SUBJECT_SETUP');

    expect(html).toContain('Policy applies to');
    expect(html).toContain('Class subject policy');
    expect(html).toContain('Class subject: Grade 7 · Mathematics');
    expect(html).toContain('Class configuration');
    expect(html).not.toContain('Subject Profile');
    expect(html).not.toContain('Any subject profile');
  });

  it('uses shared form validation feedback instead of silent local validation returns', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/plugins/cbc/components/reportPolicies/CbcReportPolicyFormModal.tsx'),
      'utf8',
    );

    expect(source).toContain('<FormValidationSummary');
    expect(source).toContain('focusFirstError(validationErrors)');
    expect(source).not.toContain('if (!validate()) return');
  });

  it('marks catalog subject profile selection as fallback reference in institution governance mode', () => {
    const html = renderModal('INSTITUTION_GOVERNANCE');

    expect(html).toContain('Class subject policy');
    expect(html).toContain('Catalog fallback / reference');
    expect(html).toContain('No catalog fallback');
    expect(html).toContain('Catalog fallback: Mathematics catalog profile (Reference only)');
    expect(html).toContain('CBC Report Policy');
  });

  it('renders academic helper text for policy authoring fields', () => {
    const html = renderModal('INSTITUTION_GOVERNANCE');

    expect(html).toContain('These decide how much each evidence category contributes to the final report. Positive weights must add up to 100.');
    expect(html).toContain("These must exist before the learner&#x27;s report can become final. If missing, the result stays provisional.");
    expect(html).toContain('These are used for baseline/context. They can appear in reports but do not have to contribute to the final score.');
    expect(html).toContain('Only active policies are used. Inactive policies are saved drafts or retired policies.');
  });

  it('renders the class/cohort label instead of the raw cohort id when available', () => {
    const html = renderModal('CLASS_SETUP');

    expect(html).toContain('Grade 7');
    expect(html).not.toContain('Class 9');
  });

  it('derives class-subject payload from locked context without sending catalog subject profile', () => {
    const payload = buildCbcReportPolicyPayload(
      baseForm(),
      'CLASS_SUBJECT_SETUP',
    );

    expect(payload.source).toBe('class_configuration');
    expect(payload.cohort).toBe(9);
    expect(payload.cbc_cohort_subject).toBe(41);
    expect(payload.subject_profile).toBeUndefined();
  });

  it('class setup mode can build whole-class payloads without subject or subject-profile scope', () => {
    const payload = buildCbcReportPolicyPayload(
      baseForm({
        policy_scope: 'COHORT',
        subject_profile: null,
        cohort: 9,
        cbc_cohort_subject: null,
      }),
      'CLASS_SETUP',
    );

    expect(payload.source).toBe('class_configuration');
    expect(payload.cohort).toBe(9);
    expect(payload).not.toHaveProperty('cbc_cohort_subject');
    expect(payload.subject_profile).toBeUndefined();
    expect(payload.is_default).toBe(false);
  });

  it('class setup mode can build specific-subject payload when a subject is selected', () => {
    const payload = buildCbcReportPolicyPayload(
      baseForm({
        policy_scope: 'COHORT_SUBJECT',
        subject_profile: 12,
        cohort: 9,
        cbc_cohort_subject: 41,
      }),
      'CLASS_SETUP',
    );

    expect(payload.source).toBe('class_configuration');
    expect(payload.cohort).toBe(9);
    expect(payload.cbc_cohort_subject).toBe(41);
    expect(payload.subject_profile).toBeUndefined();
    expect(payload.is_default).toBe(false);
  });

  it('class setup mode can build workspace-default payload without class or subject scope', () => {
    const payload = buildCbcReportPolicyPayload(
      baseForm({
        policy_scope: 'WORKSPACE_DEFAULT',
        subject_profile: 12,
        cohort: 9,
        cbc_cohort_subject: 41,
        is_default: true,
      }),
      'CLASS_SETUP',
    );

    expect(payload.source).toBe('class_configuration');
    expect(payload.is_default).toBe(true);
    expect(payload).not.toHaveProperty('cohort');
    expect(payload).not.toHaveProperty('cbc_cohort_subject');
    expect(payload.subject_profile).toBeUndefined();
  });

  it('preserves subject profile authoring in institution governance payloads', () => {
    const payload = buildCbcReportPolicyPayload(
      baseForm(),
      'INSTITUTION_GOVERNANCE',
    );

    expect(payload.source).toBe('institution_governance');
    expect(payload.subject_profile).toBe(12);
  });

  it('maps backend field errors to visible field-level errors', () => {
    const mapped = mapCbcReportPolicyApiErrors(
      {
        response: {
          data: {
            name: ['This field cannot be blank.'],
            assessment_weights: ['Weights must total 100.'],
            level_scale: ['Invalid CBC levels.'],
            term: ['Term outside your organization.'],
          },
        },
      },
      'CLASS_SETUP',
    );

    expect(mapped.globalError).toBeNull();
    expect(mapped.fieldErrors.name).toBe('This field cannot be blank.');
    expect(mapped.fieldErrors.assessment_weights).toBe('Weights must total 100.');
    expect(mapped.fieldErrors.level_scale).toBe('Invalid CBC levels.');
    expect(mapped.fieldErrors.term).toBe('Term outside your organization.');
    expect(mapped.firstTarget).toBe('name');
  });

  it('keeps non-field backend errors global', () => {
    const mapped = mapCbcReportPolicyApiErrors(
      {
        response: {
          data: {
            non_field_errors: ['Class report setup requires a class subject, class, or workspace default policy scope.'],
          },
        },
      },
      'CLASS_SETUP',
    );

    expect(mapped.fieldErrors).toEqual({});
    expect(mapped.globalError).toContain('Class report setup requires');
    expect(mapped.firstTarget).toBeNull();
  });

  it('renders hidden or derived class-configuration errors near the scope section', () => {
    const derivedSubjectProfile = mapCbcReportPolicyApiErrors(
      {
        response: {
          data: {
            subject_profile: ['Class report setup cannot author subject-profile-only CBC report policies.'],
          },
        },
      },
      'CLASS_SETUP',
    );
    const mapped = mapCbcReportPolicyApiErrors(
      {
        response: {
          data: {
            subject_profile: ['Class report setup cannot author subject-profile-only CBC report policies.'],
            cbc_cohort_subject: ['CBC cohort subject outside your organization.'],
          },
        },
      },
      'CLASS_SETUP',
    );

    expect(derivedSubjectProfile.fieldErrors.scope).toBe(
      'Choose a class subject instead of a catalog subject profile.',
    );
    expect(mapped.globalError).toBeNull();
    expect(mapped.fieldErrors.scope).toBe('CBC cohort subject outside your organization.');
    expect(mapped.fieldErrors.cbc_cohort_subject).toBe('CBC cohort subject outside your organization.');
    expect(mapped.firstTarget).toBe('scope');
  });
});

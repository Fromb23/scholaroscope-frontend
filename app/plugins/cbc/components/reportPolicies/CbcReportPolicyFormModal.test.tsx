import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  buildCbcReportPolicyPayload,
  CbcReportPolicyFormModal,
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

function renderModal(authoringMode: 'CLASS_SUBJECT_SETUP' | 'INSTITUTION_GOVERNANCE') {
  return renderToStaticMarkup(
    <CbcReportPolicyFormModal
      editingPolicy={null}
      authoringMode={authoringMode}
      lockedCohortId={9}
      lockedCohortSubjectId={41}
      lockedCohortSubjectLabel="Grade 7 · Mathematics"
      subjectProfiles={[
        { id: 12, label: 'Mathematics catalog profile' },
      ]}
      cohorts={[
        { id: 9, label: 'Grade 7' },
      ]}
      cohortSubjects={[
        {
          id: 41,
          label: 'Grade 7 · Mathematics',
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
  it('uses locked class-subject setup copy instead of national subject profile selection', () => {
    const html = renderModal('CLASS_SUBJECT_SETUP');

    expect(html).toContain('This class subject');
    expect(html).toContain('Grade 7 · Mathematics');
    expect(html).toContain('Class configuration');
    expect(html).not.toContain('Subject Profile');
    expect(html).not.toContain('Any subject profile');
  });

  it('keeps broad subject profile selection in institution governance mode', () => {
    const html = renderModal('INSTITUTION_GOVERNANCE');

    expect(html).toContain('Subject Profile');
    expect(html).toContain('Any subject profile');
    expect(html).toContain('CBC Report Policy');
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

  it('preserves subject profile authoring in institution governance payloads', () => {
    const payload = buildCbcReportPolicyPayload(
      baseForm(),
      'INSTITUTION_GOVERNANCE',
    );

    expect(payload.source).toBe('institution_governance');
    expect(payload.subject_profile).toBe(12);
  });
});

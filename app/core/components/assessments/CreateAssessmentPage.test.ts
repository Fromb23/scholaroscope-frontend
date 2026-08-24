import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assessments/CreateAssessmentPage.tsx'),
  'utf8',
);

describe('CreateAssessmentPage foreground action state', () => {
  it('keeps critical create errors visible until dismissed', () => {
    const pageSource = source();

    expect(pageSource).toContain('saveError ? (');
    expect(pageSource).toContain('<ActionStateBanner');
    expect(pageSource).toContain('Assessment not created');
    expect(pageSource).not.toContain('autoDismissMs={5000}');
  });

  it('shows submit disabled and all-components-created reasons in the active form area', () => {
    const pageSource = source();

    expect(pageSource).toContain('ALL_COMPONENTS_CREATED_MESSAGE');
    expect(pageSource).toContain('Edit an existing assessment or create practice work.');
    expect(pageSource).toContain('Next official component: {availableAssessmentComponents[0].label}.');
    expect(pageSource).toContain('submitDisabledReason ? (');
    expect(pageSource).toContain('variant={cbcComponentsExhausted ? \'blocked\' : \'warning\'}');
  });

  it('starts creation with teacher-facing School and Quick assessment choices', () => {
    const pageSource = source();

    expect(pageSource).toContain('School assessment');
    expect(pageSource).toContain('Quick assessment');
    expect(pageSource).toContain('An official assessment that follows your school&apos;s assessment policy.');
    expect(pageSource).toContain('A short classroom assessment for one learning objective.');
  });

  it('gates school policy guidance away from Quick assessments', () => {
    const pageSource = source();

    expect(pageSource).toContain('const isQuickAssessment = form.governance === AssessmentGovernance.FORMATIVE');
    expect(pageSource).toContain('const isSchoolCbcPolicyContext = usesSchoolPolicy && isCbcPolicyContext');
    expect(pageSource).toContain('if (!isSchoolCbcPolicyContext || !form.term || !form.cohort_subject)');
    expect(pageSource).toContain('{!isQuickAssessment ? (');
    expect(pageSource).toContain('<AssessmentPolicyPreviewCard');
  });

  it('requires exactly one learning objective path for Quick assessments', () => {
    const pageSource = source();

    expect(pageSource).toContain('Select a learning objective or enter one.');
    expect(pageSource).toContain('Use an available curriculum objective for this class subject.');
    expect(pageSource).toContain('Enter a custom learning objective');
    expect(pageSource).toContain('setField(\'objective_provider\', null)');
    expect(pageSource).toContain('setField(\'objective_reference_id\', null)');
  });
});

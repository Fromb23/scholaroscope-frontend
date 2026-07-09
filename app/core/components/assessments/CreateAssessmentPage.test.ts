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
});

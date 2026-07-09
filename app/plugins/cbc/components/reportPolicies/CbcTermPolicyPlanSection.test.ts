import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/plugins/cbc/components/reportPolicies/CbcTermPolicyPlanSection.tsx'),
  'utf8',
);

describe('CbcTermPolicyPlanSection', () => {
  it('uses simple term report setup language', () => {
    const component = source();

    expect(component).toContain('Term report setup');
    expect(component).toContain('Ready for computation');
    expect(component).toContain('Not ready:');
    expect(component).toContain('No active organization policies');
    expect(component).not.toContain('Plan {plan.status}');
  });

  it('keeps plugin warnings and setup actions visible', () => {
    const component = source();

    expect(component).toContain('Scholaroscope default policy is only a template');
    expect(component).toContain('Create one policy for all subjects');
    expect(component).toContain('Reuse previous term policy');
    expect(component).toContain('Create policies for missing subjects');
    expect(component).toContain('Review active policies');
  });

  it('hides engine details behind advanced details', () => {
    const component = source();

    expect(component).toContain('Advanced details');
    expect(component).toContain('advancedOpen ?');
    expect(component).toContain('Resolution path');
    expect(component).toContain('Selected policies');
    expect(component).not.toContain('Selected policy ids');
  });
});

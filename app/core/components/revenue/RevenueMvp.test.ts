import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_REVENUE_TIERS, money, percent } from './RevenueFormat';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('institutional revenue MVP frontend', () => {
  it('formats projected KES money and scheme implementation percentages', () => {
    expect(money('3000.00')).toBe('KES 3,000');
    expect(percent('0.755')).toBe('75.5%');
  });

  it('keeps default tier boundaries visible for policy management', () => {
    expect(DEFAULT_REVENUE_TIERS.map((tier) => `${tier.lower_bound}-${tier.upper_bound}`)).toEqual([
      '0.00-49.99',
      '50.00-74.99',
      '75.00-89.99',
      '90.00-100.00',
    ]);
  });

  it('uses required projected and governance terminology in revenue surfaces', () => {
    const overview = source('app/core/components/revenue/RevenueOverviewPage.tsx');
    const cycle = source('app/core/components/revenue/RevenueCycleDetailPage.tsx');
    const statement = source('app/core/components/revenue/TeacherContributionStatementDetailPage.tsx');
    const combined = `${overview}\n${cycle}\n${statement}`;

    for (const phrase of [
      'Projected learner contribution',
      'Projected gross contribution',
      'Scheme implementation',
      'Required assessment compliance',
      'Projected teacher contribution',
      'Calculation run',
      'Revenue cycle',
    ]) {
      expect(combined).toContain(phrase);
    }
  });

  it('does not add financial-transfer action labels to revenue surfaces', () => {
    const combined = [
      source('app/core/components/revenue/RevenueOverviewPage.tsx'),
      source('app/core/components/revenue/RevenuePoliciesPage.tsx'),
      source('app/core/components/revenue/RevenueCycleDetailPage.tsx'),
      source('app/core/components/revenue/TeacherContributionStatementDetailPage.tsx'),
    ].join('\n');

    expect(combined).not.toMatch(/Collect|Settle|Activate subscription|M-Pesa|Payment provider/i);
  });

  it('adds the scheme-entry link to existing session forms only', () => {
    const createForm = source('app/core/components/sessions/SessionForm.tsx');
    const editForm = source('app/core/components/sessions/EditSessionForm.tsx');

    expect(createForm).toContain('Scheme implementation');
    expect(editForm).toContain('Scheme implementation');
    expect(createForm).toContain('scheme_entry');
    expect(editForm).toContain('scheme_entry');
  });
});

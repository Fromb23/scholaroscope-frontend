import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_REVENUE_TIERS,
  blockersFrom,
  money,
  percent,
  tierFromForm,
  tierToForm,
} from './RevenueFormat';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('institutional revenue MVP frontend', () => {
  it('formats projected KES money and scheme implementation percentages', () => {
    expect(money('3000.00')).toBe('KES 3,000');
    expect(percent('0.755')).toBe('75.5%');
  });

  it('keeps canonical 0-1 default tier boundaries at the API boundary', () => {
    expect(DEFAULT_REVENUE_TIERS.map((tier) => `${tier.minimum_ratio}-${tier.maximum_ratio}`)).toEqual([
      '0.0000-0.4999',
      '0.5000-0.7499',
      '0.7500-0.8999',
      '0.9000-1.0000',
    ]);
  });

  it('converts 0-1 backend ratios to 0-100 form percentages and back', () => {
    const form = tierToForm({
      minimum_ratio: '0.5000',
      maximum_ratio: '0.7499',
      projected_amount: '3000.00',
      label: 'Middle',
    });
    expect(form.minimum_percentage).toBe('50');
    expect(form.maximum_percentage).toBe('74.99');
    expect(tierFromForm(form)).toEqual({
      minimum_ratio: '0.5000',
      maximum_ratio: '0.7499',
      projected_amount: '3000.00',
      label: 'Middle',
    });
  });

  it('normalizes structured blockers without rendering object strings', () => {
    const blockers = blockersFrom([{ code: 'missing_required_assessment', message: 'Required finalized assessment components are missing.', details: {} }]);
    expect(blockers[0].message).toBe('Required finalized assessment components are missing.');
    expect(blockers.map((blocker) => blocker.message)).not.toContain('[object Object]');
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
    expect(createForm).toContain('teaching_assignment');
    expect(editForm).toContain('teaching_assignment');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CbcReportPoliciesPage foreground actions', () => {
  it('routes prepare and recommendation actions through the foreground prepare sheet', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/plugins/cbc/components/reportPolicies/CbcReportPoliciesPage.tsx'),
      'utf8',
    );

    expect(pageSource).toContain('<ReportPrepareTermSheet');
    expect(pageSource).toContain('autoPrepareKey={prepareAutoRunKey}');
    expect(pageSource).toContain('Review recommended fixes');
    expect(pageSource).not.toContain('recommended report setup fix');
  });
});

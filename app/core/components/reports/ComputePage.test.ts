import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report compute form validation', () => {
  it('shows visible term feedback instead of silently skipping computation', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ComputePage.tsx'),
      'utf8',
    );
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/reports/useComputePage.ts'),
      'utf8',
    );

    expect(pageSource).toContain('<FormValidationSummary');
    expect(pageSource).toContain("error={getFormFieldErrorMessage(fieldErrors.term)}");
    expect(pageSource).toContain('focusFirstError(fieldErrors)');
    expect(hookSource).toContain('Select a term before computing.');
    expect(hookSource).not.toContain('if (!selectedTerm) return;');
  });

  it('uses one readiness-driven official compute action', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ComputePage.tsx'),
      'utf8',
    );
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/reports/useComputePage.ts'),
      'utf8',
    );

    expect(pageSource).toContain('Compute Reports');
    expect(pageSource).toContain('Reporting Setup');
    expect(pageSource).toContain('Prepare Term for Reports');
    expect(pageSource).toContain('Manage Report Policies');
    expect(pageSource).not.toContain('Policy-Based Grade Computation');
    expect(pageSource).not.toContain('Compute All Summaries');
    expect(pageSource).not.toContain('Summary Recomputation');
    expect(hookSource).toContain('getComputeReadiness');
    expect(hookSource).toContain('streamComputeJobEvents');
    expect(hookSource).toContain('computeReports');
  });

  it('keeps compute progress and terminal states in a foreground sheet', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ComputePage.tsx'),
      'utf8',
    );
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/reports/useComputePage.ts'),
      'utf8',
    );

    expect(pageSource).toContain('function ComputeReportsSheet');
    expect(pageSource).toContain('<ResponsiveActionSheet');
    expect(pageSource).toContain('<ActionProgress');
    expect(pageSource).toContain('Reports computed successfully');
    expect(pageSource).toContain('Computation blocked');
    expect(hookSource).toContain('setComputeSheetOpen(true)');
    expect(hookSource).toContain('setComputeActionError(');
    expect(hookSource).not.toContain("setGlobalError(\n                resolved.serverCode === 'report_compute_blocked'");
  });

  it('opens prepare term in a foreground sheet with recommendations', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ComputePage.tsx'),
      'utf8',
    );
    const sheetSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ReportPrepareTermSheet.tsx'),
      'utf8',
    );

    expect(pageSource).toContain('<ReportPrepareTermSheet');
    expect(pageSource).toContain('autoPrepareKey={prepareAutoRunKey}');
    expect(sheetSource).toContain('Recommendations');
    expect(sheetSource).toContain('Apply Recommended Fix');
    expect(sheetSource).toContain('Preparation failed');
  });
});

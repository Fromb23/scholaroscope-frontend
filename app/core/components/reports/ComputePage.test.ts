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

  it('uses readiness-driven incremental compute with explicit full rebuild', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ComputePage.tsx'),
      'utf8',
    );
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/reports/useComputePage.ts'),
      'utf8',
    );

    expect(pageSource).toContain('Compute Incremental Reports');
    expect(pageSource).toContain('Full Rebuild');
    expect(pageSource).toContain("handleComputeReports('INCREMENTAL')");
    expect(pageSource).toContain("handleComputeReports('FULL_REBUILD')");
    expect(pageSource).toContain('Full rebuild recomputes every applicable report scope');
    expect(pageSource).toContain('Reporting Setup');
    expect(pageSource).toContain('Prepare Term for Reports');
    expect(pageSource).toContain('Manage Report Policies');
    expect(pageSource).not.toContain('Policy-Based Grade Computation');
    expect(pageSource).not.toContain('Compute All Summaries');
    expect(pageSource).not.toContain('Summary Recomputation');
    expect(hookSource).toContain('getComputeReadiness');
    expect(hookSource).toContain('streamComputeJobEvents');
    expect(hookSource).toContain("mode: ReportComputeMode = 'INCREMENTAL'");
    expect(hookSource).toContain('computeReports(termId, mode)');
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
    expect(pageSource).toContain('Live updates disconnected. Checking progress periodically.');
    expect(pageSource).toContain('Live updates restored.');
    expect(pageSource).toContain('Partial batch failure');
    expect(pageSource).toContain('created, {updatedCount} updated');
    expect(pageSource).toContain('Reports computed successfully');
    expect(pageSource).toContain('Computation blocked');
    expect(hookSource).toContain('setComputeSheetOpen(true)');
    expect(hookSource).toContain('setComputeActionError(');
    expect(hookSource).toContain('mergeProgressEvent');
    expect(hookSource).toContain('ReportComputeStreamFallbackError');
    expect(hookSource).not.toContain("setGlobalError(\n                resolved.serverCode === 'report_compute_blocked'");
  });

  it('implements resumable authenticated SSE with polling fallback', () => {
    const apiSource = readFileSync(
      join(process.cwd(), 'app/core/api/reporting.ts'),
      'utf8',
    );
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/reports/useComputePage.ts'),
      'utf8',
    );

    expect(apiSource).toContain("line.startsWith('id:')");
    expect(apiSource).toContain("parsed.searchParams.set('after', String(after));");
    expect(apiSource).toContain("headers['Last-Event-ID'] = String(lastSequence);");
    expect(apiSource).toContain('refreshAccessToken();');
    expect(apiSource).toContain('text/event-stream');
    expect(apiSource).toContain('ReportComputeStreamFallbackError');
    expect(apiSource).toContain('streamDelay(retryCount - 1)');
    expect(apiSource).not.toContain('console.log(token');
    expect(hookSource).toContain("setTransportState('polling')");
    expect(hookSource).toContain('pollComputeJob(createdJob.job_id)');
    expect(hookSource).toContain('lastSequenceRef.current');
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

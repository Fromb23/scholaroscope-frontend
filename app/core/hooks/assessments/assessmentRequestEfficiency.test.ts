import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('assessment request efficiency contract', () => {
  it('merges authoritative bulk-score rows without an immediate list refetch', () => {
    const source = read('app/core/hooks/useAssessments.ts');
    const bulkEntry = source.slice(
      source.indexOf('const bulkEntry = async'),
      source.indexOf('return {', source.indexOf('const bulkEntry = async')),
    );

    expect(bulkEntry).toContain('setScores');
    expect(bulkEntry).not.toContain('fetchScores()');
  });

  it('does not refetch assessment detail after authoritative score or reopen responses', () => {
    const source = read('app/core/hooks/assessments/useAssessmentDetailPage.ts');
    const scoreSave = source.slice(
      source.indexOf('const handleSaveScores'),
      source.indexOf('const handleDownloadPdf'),
    );
    const reopen = source.slice(
      source.indexOf('const handleReopenAssessment'),
      source.indexOf('return {', source.indexOf('const handleReopenAssessment')),
    );

    expect(scoreSave).not.toContain('refetch()');
    expect(reopen).not.toContain('refetch(),');
    expect(reopen).toContain('refetchScores()');
  });
});

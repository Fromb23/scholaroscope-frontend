import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const detailSource = () => readFileSync(
  join(process.cwd(), 'app/core/components/assessments/AssessmentDetailPage.tsx'),
  'utf8',
);

const stageCardSource = () => readFileSync(
  join(process.cwd(), 'app/core/components/assessments/AssessmentStageActionCard.tsx'),
  'utf8',
);

describe('AssessmentDetailPage stage-oriented actions', () => {
  it('renders assessment progress and one primary stage action', () => {
    const source = detailSource();

    expect(source).toContain('AssessmentStageActionCard');
    expect(source).toContain('primaryAssessmentActionLabel');
    expect(source).toContain('currentAssessmentStage');
  });

  it('puts assessment secondary actions behind More', () => {
    const source = stageCardSource();

    expect(source).toContain('ActionMenu');
    expect(source).toContain('secondaryActions');
    expect(source).toContain('buttonLabel="More"');
    expect(source).toContain('primaryAction');
  });

  it('uses teacher-facing labels instead of raw assessment statuses', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/assessments/AssessmentDetailHeader.tsx'),
      'utf8',
    );

    expect(source).toContain('Prepared');
    expect(source).toContain('Scores open');
    expect(source).toContain('Results finalized');
    expect(source).not.toContain('>Draft<');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const detailSource = () =>
  readFileSync(
    join(process.cwd(), 'app/core/components/assessments/AssessmentDetailPage.tsx'),
    'utf8',
  );

const stageCardSource = () =>
  readFileSync(
    join(process.cwd(), 'app/core/components/assessments/AssessmentStageActionCard.tsx'),
    'utf8',
  );

const infoCardSource = () =>
  readFileSync(
    join(process.cwd(), 'app/core/components/assessments/AssessmentInfoCard.tsx'),
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

  it('uses teacher-facing labels for School and Quick assessment categories', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/assessments/AssessmentDetailHeader.tsx'),
      'utf8',
    );
    const typeSource = readFileSync(
      join(process.cwd(), 'app/core/types/assessment.ts'),
      'utf8',
    );

    expect(source).toContain('getAssessmentGovernanceLabel');
    expect(source).toContain('AssessmentGovernance.FORMATIVE');
    expect(typeSource).toContain('School assessment');
    expect(typeSource).toContain('Quick assessment');
  });

  it('adapts the existing Back action from safe returnTo and canonical fallbacks', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/assessments/AssessmentDetailHeader.tsx'),
      'utf8',
    );
    expect(source).toContain('resolveOperationalDetailBack');
    expect(source).toContain('getOperationalDetailBackLabel');
    expect(source).toContain("searchParams.get('returnTo')");
    expect(source.match(/<ArrowLeft/g)).toHaveLength(1);
  });

  it('keeps ask-admin assessment flows behind backend workspace governance', () => {
    const source = detailSource();

    expect(source).toContain('supportsInternalRequests');
    expect(source).toContain('showInternalRequestActions');
    expect(source).toContain('!isFinalized && !canScore && showInternalRequestActions');
    expect(source).toContain('isFinalized && !canReopen && showInternalRequestActions');
    expect(source).toContain('Ask admin for late score entry');
  });

  it('shows Quick assessment objective and excludes report policy preview', () => {
    const source = infoCardSource();

    expect(source).toContain('getAssessmentObjectiveText');
    expect(source).toContain('Learning objective');
    expect(source).toContain('This assessment does not affect official school report grades.');
    expect(source).toContain('{!isQuickAssessment ? (');
    expect(source).toContain('<AssessmentPolicyPreviewCard');
  });

  it('does not claim Quick assessment finalization queues formal grade computation', () => {
    const source = detailSource();

    expect(source).toContain('const isQuickAssessment = assessment.governance === AssessmentGovernance.FORMATIVE');
    expect(source).toContain('This assessment is finalized. Scores are locked.');
    expect(source).toContain('Scores are locked and grades have been queued for computation.');
  });
});

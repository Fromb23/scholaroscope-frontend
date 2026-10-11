import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/learners/LearnerTransferWorkflow.tsx'),
  'utf8',
);

describe('learner transfer workflow', () => {
  it('loads eligible destinations when the routed workflow opens', () => {
    expect(source).toContain('learnersAPI.getEligibleTransferCohorts(learnerId)');
    expect(source).not.toContain('useCohorts(');
  });

  it('previews impact, requires explicit optional choices, and submits idempotently', () => {
    expect(source).toContain('learnersAPI.previewTransfer');
    expect(source).toContain('optional_subject_ids: selectedOptional');
    expect(source).toContain('idempotency_key: idempotencyKey');
    expect(source).toContain('parseAppDestination');
  });
});

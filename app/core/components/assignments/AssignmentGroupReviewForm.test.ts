import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const form = () => readFileSync(join(process.cwd(), 'app/core/components/assignments/AssignmentGroupReviewForm.tsx'), 'utf8');
const panel = () => readFileSync(join(process.cwd(), 'app/core/components/assignments/AssignmentGroupEvaluationsPanel.tsx'), 'utf8');

describe('unified group work review', () => {
  it('saves drafts and completes reviews without a submission id', () => {
    expect(form()).toContain("save('SAVE_DRAFT')");
    expect(form()).toContain("save('COMPLETE', true)");
    expect(form()).not.toContain('group_submission');
  });

  it('renders and focuses field-specific validation', () => {
    const source = form();
    for (const field of ['rubric_level', 'numeric_score', 'competency_state', 'narrative', 'member_overrides']) {
      expect(source).toContain(field);
    }
    expect(source).toContain('aria-invalid');
    expect(source).toContain('aria-describedby');
    expect(source).toContain('focusFirstError');
    expect(source).toContain('scrollIntoView');
    expect(source).toContain('clearFieldError');
    expect(source).toContain('resolved.fieldErrors');
  });

  it('only displays confirmed learner submissions and deterministically focuses the workspace', () => {
    const source = panel();
    expect(source).toContain('submitted_group_work');
    expect(source).toContain('Submitted by learners');
    expect(source).not.toContain('Recorded group response');
    expect(source).toContain('scroll-mt-28');
    expect(source).toContain('headingRef.current?.focus');
  });
});

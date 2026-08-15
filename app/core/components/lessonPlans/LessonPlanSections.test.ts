import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/lessonPlans/LessonPlanSections.tsx'),
  'utf8',
);

describe('LessonPlanSections information architecture', () => {
  it('does not render the old duplicated lesson context card', () => {
    expect(source).not.toContain('Lesson Context');
    expect(source).not.toContain('Class Subject');
    expect(source).not.toContain('Selected References');
  });

  it('merges structured conclusion details into an existing conclusion phase', () => {
    expect(source).toContain('mergeConclusionIntoPhase');
    expect(source).toContain("phase.phase_type.toUpperCase() !== 'CONCLUSION'");
    expect(source).toContain('!hasConclusionPhase');
  });
});

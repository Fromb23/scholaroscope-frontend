import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/dashboard/InstructorDashboardWidgets.tsx'),
  'utf8',
);

describe('Instructor dashboard widget teaching memory behavior', () => {
  it('makes TodayScheduleCard contextual rather than a competing action engine', () => {
    const widgetSource = source();

    expect(widgetSource).toContain('getTodayScheduleStatusLabel');
    expect(widgetSource).toContain('Action shown above');
    expect(widgetSource).toContain('queueAction?.stageLabel');
    expect(widgetSource).not.toContain('getTodayScheduleActionLabel');
  });

  it('marks assessment review rows when the primary assessment action is shown above', () => {
    const widgetSource = source();

    expect(widgetSource).toContain('primaryAssessmentObjectKey');
    expect(widgetSource).toContain('getAssessmentTeachingObjectKey');
    expect(widgetSource).toContain('Action shown above');
  });
});

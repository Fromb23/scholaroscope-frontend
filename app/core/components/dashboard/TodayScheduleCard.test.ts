import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/dashboard/InstructorDashboardWidgets.tsx'),
  'utf8',
);

describe('TodayScheduleCard queue behavior', () => {
  it('shows schedule context without repeating the primary queue action', () => {
    const widgetSource = source();

    expect(widgetSource).toContain('getTodayScheduleStatusLabel');
    expect(widgetSource).toContain('Action shown above');
    expect(widgetSource).toContain('queueAction?.stageLabel');
    expect(widgetSource).not.toContain('getTodayScheduleActionLabel');
  });
});

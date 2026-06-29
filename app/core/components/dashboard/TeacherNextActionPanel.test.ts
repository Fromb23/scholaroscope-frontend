import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/dashboard/TeacherNextActionPanel.tsx'),
  'utf8',
);

describe('TeacherNextActionPanel teaching memory contract', () => {
  it('renders from the central queue instead of computing its own next action', () => {
    const panelSource = source();

    expect(panelSource).toContain('queue.primaryAction');
    expect(panelSource).toContain('queue.relatedPrimaryActions');
    expect(panelSource).not.toContain('function buildNextAction');
    expect(panelSource).not.toContain('schedule_state ===');
  });

  it('shows one primary action, one optional secondary action, and More', () => {
    const panelSource = source();

    expect(panelSource).toContain('action.primaryLabel');
    expect(panelSource).toContain('firstSecondary');
    expect(panelSource).toContain('ActionMenu');
    expect(panelSource).toContain('buttonLabel="More"');
  });

  it('filters zero-value summary chips from quiet dashboard memory', () => {
    const panelSource = source();

    expect(panelSource).toContain('visible: metrics.assessments.needsGrading > 0');
    expect(panelSource).toContain('visible: supportCount > 0');
    expect(panelSource).toContain('summaryItems.length > 0 ? (');
  });
});

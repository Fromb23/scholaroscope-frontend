import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/dashboard/SessionReminderPanel.tsx'),
  'utf8',
);

describe('SessionReminderPanel queue support', () => {
  it('does not repeat a primary lesson action already owned by the queue', () => {
    const panelSource = source();

    expect(panelSource).toContain('isPrimaryActionObject');
    expect(panelSource).toContain('Action shown above');
    expect(panelSource).not.toContain('onEndLesson');
  });

  it('keeps secondary lesson actions behind More', () => {
    const panelSource = source();

    expect(panelSource).toContain('ActionMenu');
    expect(panelSource).toContain('buttonLabel="More"');
    expect(panelSource).toContain('queueAction?.secondaryActions');
  });
});

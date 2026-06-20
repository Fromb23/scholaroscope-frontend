import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('instructor cohort subject reports page', () => {
  it('uses a visible themed button for the card CTA', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/(dashboard)/reports/instructor/cohort-subjects/page.tsx'),
      'utf8',
    );

    expect(source).toContain('<Button variant="secondary" size="sm">Open report</Button>');
    expect(source).not.toContain('<Button variant="ghost" size="sm">Open</Button>');
  });
});

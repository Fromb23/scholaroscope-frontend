import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/components/ui/Modal.tsx'),
  'utf8',
);

describe('Modal responsive action surface defaults', () => {
  it('does not allow accidental backdrop close unless a caller opts in', () => {
    expect(source).toContain('closeOnBackdrop = false');
    expect(source).toContain('preventBackdropClose={closeDisabled || !closeOnBackdrop}');
  });

  it('passes closeDisabled and footer through to ResponsiveActionSheet', () => {
    expect(source).toContain('closeDisabled={closeDisabled}');
    expect(source).toContain('footer={footer}');
    expect(source).toContain('<ResponsiveActionSheet');
  });
});

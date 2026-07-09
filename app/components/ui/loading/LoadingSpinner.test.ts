import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/components/ui/loading/LoadingSpinner.tsx'),
  'utf8',
);

describe('LoadingSpinner', () => {
  it('can provide loading copy without rendering duplicate visible text', () => {
    expect(source).toContain('showMessage = true');
    expect(source).toContain('hasVisibleMessage');
    expect(source).toContain('aria-label={!hasVisibleMessage');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SubjectCataloguePage toast channel', () => {
  it('uses the shared toast provider instead of local toast state', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/core/components/academic/subjects/SubjectCataloguePage.tsx'),
      'utf8',
    );

    expect(source).toContain('useToast');
    expect(source).toContain('showToast');
    expect(source).not.toContain('toastMessage');
    expect(source).not.toContain('setToastMessage');
  });
});

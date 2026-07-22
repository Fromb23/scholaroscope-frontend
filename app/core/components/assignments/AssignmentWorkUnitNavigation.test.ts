import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assignments/AssignmentWorkUnitNavigation.tsx'),
  'utf8',
);

describe('AssignmentWorkUnitNavigation', () => {
  it('is presentational and renders previous/current/next controls', () => {
    const componentSource = source();

    expect(componentSource).toContain('Previous');
    expect(componentSource).toContain('Next');
    expect(componentSource).toContain('{label} {safeIndex} of {totalCount}');
    expect(componentSource).not.toContain('useAssignment');
    expect(componentSource).not.toContain('router.');
    expect(componentSource).not.toContain('mutateAsync');
  });
});

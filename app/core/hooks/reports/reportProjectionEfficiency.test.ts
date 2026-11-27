import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hook = readFileSync(
  'app/core/hooks/reports/useCanonicalCohortSubjectReport.ts',
  'utf8',
);
const keys = readFileSync('app/core/lib/queryKeys.ts', 'utf8');

describe('canonical report projection request contract', () => {
  it('reuses the established query cache for fresh projection navigation', () => {
    expect(hook).toContain("from '@tanstack/react-query'");
    expect(hook).toContain('staleTime: 60_000');
    expect(hook).not.toContain('useEffect');
  });

  it('scopes cached reports to workspace, actor, generation, hierarchy and authority', () => {
    expect(keys).toContain('cohortSubjectProjection');
    for (const dimension of [
      'organizationId',
      'actorId',
      'workspaceGeneration',
      'cohortSubjectId',
      'termId',
      'authorityMode',
      'projection',
    ]) {
      expect(keys).toContain(dimension);
    }
  });
});

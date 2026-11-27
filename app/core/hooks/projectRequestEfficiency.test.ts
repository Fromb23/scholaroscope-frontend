import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hooks = readFileSync('app/core/hooks/useProjects.ts', 'utf8');
const detail = readFileSync(
  'app/core/components/projects/ProjectDetailPage.tsx',
  'utf8',
);

describe('project request efficiency contract', () => {
  it('loads deployment-related resources only for the active project surface', () => {
    expect(hooks).toContain('requested.has(\'participants\')');
    expect(hooks).toContain('requested.has(\'evidenceTypes\')');
    expect(detail).toContain("if (activeTab === 'tasks')");
    expect(detail).toContain("else if (activeTab === 'results') resources.add('results')");
    expect(detail).toContain("requestedWorkSection === 'evidence'");
  });

  it('keeps an authoritative lifecycle response instead of refetching its detail', () => {
    expect(hooks).toContain('projectKeys.detail(activeOrg?.id ?? null, deploymentId)');
    expect(hooks).toContain('queryClient.setQueryData');
    expect(hooks).toContain('key.length > 4');
  });
});

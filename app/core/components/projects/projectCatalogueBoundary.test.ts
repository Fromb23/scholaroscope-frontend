import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalogue = readFileSync('app/core/components/projects/ProjectCataloguePage.tsx', 'utf8');
const imports = readFileSync('app/core/components/projects/ProjectImportsPage.tsx', 'utf8');
const api = readFileSync('app/core/api/projects.ts', 'utf8');
const hooks = readFileSync('app/core/hooks/useProjects.ts', 'utf8');
const auth = readFileSync('app/context/AuthContext.tsx', 'utf8');

describe('Projects catalogue authority boundary', () => {
  it('never exposes official upload controls in the organization workflow', () => {
    expect(imports).toContain('Custom organization projects');
    expect(imports).not.toMatch(/Claimed authority|Claimed curriculum|Official PDF/);
  });

  it('keeps platform catalogue UI outside the workspace application', () => {
    expect(imports).toContain('separate platform control plane');
    expect(api).not.toContain('/platform/projects/official-sources/');
  });

  it('renders only catalogue rows and eligible targets returned by the server', () => {
    expect(catalogue).toContain('definition.eligible_cohort_subjects');
    expect(catalogue).not.toMatch(/pathway|combination|CbcSubjectProfile/);
    expect(api).toContain("'/project-catalogue/'");
  });

  it('labels ownership and keeps official definitions read-only', () => {
    expect(catalogue).toContain('Organization project');
    expect(catalogue).toContain('Read-only definition');
  });

  it('creates deployments only from server-provided eligible cohort subjects', () => {
    expect(catalogue).toContain('eligible_cohort_subjects.find');
    expect(catalogue).toContain('projectsAPI.createDeployment');
  });

  it('does not branch project rendering by role name', () => {
    expect(`${catalogue}\n${imports}`).not.toMatch(/activeRole|role_slug|role\.slug|\bHOD\b|\bPRINCIPAL\b/);
  });

  it('keys project queries by workspace and clears cached state on authority changes', () => {
    expect(hooks).toContain('activeOrg?.id');
    expect(auth).toContain('queryClient.clear()');
  });
});

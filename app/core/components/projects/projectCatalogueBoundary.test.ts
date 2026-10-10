import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalogue = readFileSync('app/core/components/projects/ProjectCataloguePage.tsx', 'utf8');
const catalogueCard = readFileSync('app/core/components/projects/ProjectCatalogueCard.tsx', 'utf8');
const registration = readFileSync(
  'app/core/components/projects/OfficialProjectRegistration.tsx',
  'utf8',
);
const projectsPage = readFileSync('app/core/components/projects/ProjectsPage.tsx', 'utf8');
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
    expect(registration).toContain('definition.eligible_cohort_subjects');
    expect(catalogue).not.toMatch(/pathway|combination|CbcSubjectProfile/);
    expect(api).toContain("'/project-catalogue/'");
  });

  it('labels ownership and keeps official definitions read-only', () => {
    expect(catalogueCard).toContain('Organization project');
    expect(catalogueCard).toContain('Read-only definition');
  });

  it('creates deployments only from server-provided eligible cohort subjects', () => {
    expect(catalogue).toContain('eligible_cohort_subjects.find');
    expect(catalogue).toContain('projectsAPI.createDeployment');
  });

  it('does not branch project rendering by role name', () => {
    expect(`${catalogue}\n${catalogueCard}\n${registration}\n${imports}`).not.toMatch(
      /activeRole|role_slug|role\.slug|\bHOD\b|\bPRINCIPAL\b/,
    );
  });

  it('keeps project aggregation server-owned and deployment-authorized', () => {
    expect(projectsPage).toContain('useProjectWorkspaces');
    expect(projectsPage).not.toContain('useProjectCatalogue');
    expect(api).toContain("'/project-workspaces/'");
  });

  it('uses the canonical atomic registration endpoint and server action values', () => {
    expect(api).toContain('`/project-catalogue/${definitionVersion}/register/`');
    expect(api).toContain("'Idempotency-Key': idempotencyKey");
    expect(hooks).toContain('queryClient.setQueryData');
    expect(hooks).toContain('queryClient.invalidateQueries({ queryKey: projectKeys.all })');
    expect(catalogueCard).toContain("available_actions.includes('REGISTER')");
    expect(catalogueCard).toContain("available_actions.includes('DEPLOY')");
    expect(catalogueCard).toContain("available_actions.includes('VIEW_PROJECT')");
  });

  it('keys project queries by workspace and clears cached state on authority changes', () => {
    expect(hooks).toContain('activeOrg?.id');
    expect(auth).toContain('queryClient.clear()');
  });
});

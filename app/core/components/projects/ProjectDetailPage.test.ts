import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () =>
  readFileSync(join(process.cwd(), 'app/core/components/projects/ProjectDetailPage.tsx'), 'utf8');

describe('ProjectDetailPage task hierarchy', () => {
  it('sets one stable semantic title across project workspace tabs', () => {
    const page = source();
    expect(page).toContain('useSemanticPageTitle(');
    expect(page).toContain('getProjectWorkspacePageTitle({');
    expect(page).toContain('deploymentQuery.isSuccess');
    expect(page).toContain('project?.id === id');
    expect(page).toContain('cohortName: project?.cohort?.name');
    expect(page.indexOf('useSemanticPageTitle(')).toBeLessThan(
      page.indexOf('if (deploymentQuery.isLoading)'),
    );
  });

  it('keeps task, scope and target in routed workflow state', () => {
    const page = source();
    expect(page).toContain("next.set('task', String(taskId))");
    expect(page).toContain("next.set('scope', selectedScope)");
    expect(page).toContain("next.set(selectedScope === 'group' ? 'group' : 'participant'");
    expect(page).toContain("next.set('section', action)");
    expect(page).toContain("for (const key of ['action', 'section']) next.delete(key)");
  });

  it('filters evidence and evaluations to the selected task and target', () => {
    const page = source();
    expect(page).toContain('item.task !== taskInView?.id');
    expect(page).toContain('item.group === selectedTarget.id');
    expect(page).toContain('item.source_group === selectedTarget.id');
    expect(page).toContain('eligible_group_ids');
  });

  it('records observations and renders correction controls from backend authority', () => {
    const page = source();
    expect(page).toContain('Record project class observation');
    expect(page).toContain('Record task class observation');
    expect(page).toContain("searchParams.get('section') === 'observation'");
    expect(page).not.toContain('resources.finalizeClassObservation.mutate(item.id)');
    expect(page).toContain('item.authority?.can_edit');
    expect(page).toContain('item.authority?.can_discard');
    expect(page).toContain('item.authority?.can_amend');
    expect(page).toContain('item.authority?.locked_reason');
  });

  it('routes overview actions into one evaluation workspace and uses atomic draft APIs', () => {
    const page = source();
    expect(page).toContain("next.set('section', 'evaluation')");
    expect(page).toContain('resources.saveEvaluationDraft.mutateAsync');
    expect(page).toContain('resources.applyGroupEvaluationDraft.mutateAsync');
    expect(page).not.toContain('<ProjectCriteriaForm');
  });

  it('groups project and task observations with actual task titles', () => {
    const page = source();
    expect(page).toContain('Project observations');
    expect(page).toContain('Observations by task');
    expect(page).toContain('Open task workspace');
    expect(page).toContain('task.title');
    expect(page).toContain('draft');
    expect(page).toContain('finalized');
  });

  it('names completion and shows server-derived readiness', () => {
    const page = source();
    expect(page).toContain('Complete project');
    expect(page).toContain('Completion readiness');
    expect(page).toContain('outstanding_evidence');
    expect(page).toContain('draft_class_observations');
  });
});

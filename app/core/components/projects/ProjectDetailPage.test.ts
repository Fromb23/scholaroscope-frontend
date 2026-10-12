import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () =>
  readFileSync(join(process.cwd(), 'app/core/components/projects/ProjectDetailPage.tsx'), 'utf8');

describe('ProjectDetailPage task hierarchy', () => {
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

  it('records class observations from their hierarchy and leaves the audit list read-only', () => {
    const page = source();
    expect(page).toContain('Record project class observation');
    expect(page).toContain('Record task class observation');
    expect(page).toContain("searchParams.get('section') === 'observation'");
    expect(page).not.toContain('resources.finalizeClassObservation.mutate(item.id)');
  });
});

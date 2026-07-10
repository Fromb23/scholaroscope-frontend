import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/components/layout/GlobalPeopleSearch.tsx'),
  'utf8',
);

describe('GlobalPeopleSearch learner intents', () => {
  const platformRoutePrefix = `/${'superadmin'}`;
  const platformDashboardRoute = `/dashboard/${'superadmin'}`;

  it('supports learner actions and superadmin result labeling', () => {
    const component = source();

    expect(component).toContain("kind: 'student' | 'instructor' | 'admin' | 'superadmin' | 'user'");
    expect(component).toContain('actions?: PeopleSearchAction[]');
    expect(component).toContain("case 'superadmin':");
    expect(component).toContain("return 'Superadmin';");
  });

  it('defensively hides superadmin results from non-superadmin users', () => {
    const component = source();

    expect(component).toContain('results.filter((result) => result.kind !== \'superadmin\')');
  });

  it('expands learner rows for intent actions instead of immediately routing to profile', () => {
    const component = source();

    expect(component).toContain("const learnerActions = result.kind === 'student'");
    expect(component).toContain('setExpandedResultKey(isExpanded ? null : resultKey);');
    expect(component).toContain('void navigateToHref(action.href);');
    expect(component).not.toContain('router.push(buildTargetUrl(result));');
  });

  it('does not request platform search scope inside the workspace app', () => {
    const component = source();

    expect(component).not.toContain(`pathname === '${platformDashboardRoute}'`);
    expect(component).not.toContain(`pathname.startsWith('${platformRoutePrefix}')`);
    expect(component).not.toContain("scope: 'platform'");
  });
});

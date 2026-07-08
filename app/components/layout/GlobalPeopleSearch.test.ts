import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/components/layout/GlobalPeopleSearch.tsx'),
  'utf8',
);

describe('GlobalPeopleSearch learner intents', () => {
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
    expect(component).toContain('void navigateToHref(action.href, result);');
    expect(component).not.toContain('router.push(buildTargetUrl(result));');
  });

  it('uses explicit platform scope only on superadmin platform routes', () => {
    const component = source();

    expect(component).toContain("pathname === '/dashboard/superadmin'");
    expect(component).toContain("pathname.startsWith('/superadmin')");
    expect(component).toContain("...(isPlatformSearchContext ? { scope: 'platform' } : {})");
  });
});

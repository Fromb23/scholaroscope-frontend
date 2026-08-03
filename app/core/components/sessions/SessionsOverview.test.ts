import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/sessions/SessionsOverview.tsx'),
  'utf8',
);

describe('SessionsOverview instructor identity display', () => {
  it('passes the explicit instructor identity policy through desktop and mobile renderers', () => {
    const component = source();

    expect(component).toContain('shouldShowInstructorIdentity');
    expect(component).toContain('showInstructorIdentity ? <TableHead>Instructor</TableHead> : null');
    expect(component).toContain('showInstructorIdentity ? (');
    expect(component).toContain('<Users className="h-4 w-4 theme-subtle shrink-0" />');
    expect(component).toContain('showInstructorIdentity={showInstructorIdentity}');
  });

  it('keeps instructor-group supervision tables explicitly identified', () => {
    const component = source();

    expect(component).toContain('renderInstructorGroup');
    expect(component).toContain('showInstructorIdentity={true}');
  });
});

describe('SessionsOverview accordion and cohort-subject grouping contracts', () => {
  it('uses one nullable expanded group key instead of inverse collapsed group state', () => {
    const component = source();

    expect(component).toContain('expandedGroupKey');
    expect(component).toContain('useState<string | null>(null)');
    expect(component).toContain('toggleExpandedSessionGroup');
    expect(component).toContain('pruneExpandedSessionGroup');
    expect(component).not.toContain('collapsedGroups');
    expect(component).not.toContain('setCollapsedGroups');
  });

  it('does not mount desktop rows or mobile cards for collapsed groups', () => {
    const component = source();

    expect(component).toContain('const isExpanded = expandedGroupKey === group.key');
    expect(component).toContain('{isExpanded ? (');
    expect(component).toContain('CohortSessionsTable');
    expect(component).toContain('CohortSessionsCards');
  });

  it('uses authoritative cohort-subject identity for class and instructor groups', () => {
    const component = source();

    expect(component).toContain('getSessionCohortSubjectGroupKey(session)');
    expect(component).not.toContain('`cohort:${session.cohort_id}`');
    expect(component).not.toContain("['cohort', session.cohort_id]");
  });
});

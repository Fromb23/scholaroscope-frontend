import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGroupBuilderHref } from './GroupRosterSummary';
import { draftGroupsFromRandomPreview, moveDraftLearner } from '@/app/core/lib/groupingDraft';

const root = process.cwd();
const projectDetail = fs.readFileSync(
  path.join(root, 'app/core/components/projects/ProjectDetailPage.tsx'),
  'utf8',
);
const summary = fs.readFileSync(
  path.join(root, 'app/core/components/grouping/GroupRosterSummary.tsx'),
  'utf8',
);
const builder = fs.readFileSync(
  path.join(root, 'app/core/components/grouping/SharedGroupBuilderPage.tsx'),
  'utf8',
);
const assignmentPanel = fs.readFileSync(
  path.join(root, 'app/core/components/assignments/AssignmentGroupsPanel.tsx'),
  'utf8',
);

describe('shared Project and Assignment grouping workflow', () => {
  it('removes the legacy bare Project group creator', () => {
    expect(projectDetail).not.toContain('Create group');
    expect(projectDetail).not.toContain('resources.createGroup');
    expect(projectDetail).toContain('<GroupRosterSummary type="project"');
  });

  it('uses one shared entry surface and backend capability controls', () => {
    expect(assignmentPanel).toContain('<GroupRosterSummary type="assignment"');
    expect(summary).toContain('data.capabilities.can_manage');
    expect(summary).toContain('Read only');
    expect(summary).toContain("hasRoster ? 'Manage groups' : 'Set up groups'");
  });

  it('renders eligible, assigned, unassigned, empty, and legacy states', () => {
    expect(summary).toContain('data.counts.eligible');
    expect(summary).toContain('data.counts.assigned');
    expect(summary).toContain('data.counts.unassigned');
    expect(summary).toContain('Legacy group — needs reconciliation');
    expect(builder).toContain('This cohort has no active eligible learners to group.');
  });

  it('builds exact dynamic Project and Assignment return destinations', () => {
    const projectReturn = '/projects/1?returnTo=%2Fprojects%2Fdefinitions%2F1&tab=groups';
    const assignmentReturn = '/academic/cohorts/7/assignments/22?tab=groups&term=4';
    const projectHref = new URL(buildGroupBuilderHref('project', 1, projectReturn), 'http://local');
    const assignmentHref = new URL(
      buildGroupBuilderHref('assignment', 22, assignmentReturn),
      'http://local',
    );
    expect(projectHref.searchParams.get('returnTo')).toBe(projectReturn);
    expect(assignmentHref.searchParams.get('returnTo')).toBe(assignmentReturn);
  });

  it('moves learners manually between groups and back to unassigned', () => {
    const draft = [
      { clientId: 'a', name: 'A', notes: '', studentIds: [1] },
      { clientId: 'b', name: 'B', notes: '', studentIds: [2] },
    ];
    const moved = moveDraftLearner(draft, 1, 'b');
    expect(moved[0].studentIds).toEqual([]);
    expect(moved[1].studentIds).toEqual([2, 1]);
    expect(moveDraftLearner(moved, 1, null)[1].studentIds).toEqual([2]);
  });

  it('turns random preview results into an unsaved editable draft', () => {
    const draft = draftGroupsFromRandomPreview([
      {
        client_id: 'preview-1',
        name: 'Team 1',
        notes: '',
        members: [{ id: 9, full_name: 'Nine', admission_number: 'A9' }],
      },
    ]);
    expect(draft).toEqual([{ clientId: 'preview-1', name: 'Team 1', notes: '', studentIds: [9] }]);
  });

  it('saves atomically, invalidates origin data, and returns to the validated origin', () => {
    expect(builder).toContain('await mutations.save.mutateAsync');
    expect(builder).toContain('await mutations.invalidateOrigin()');
    expect(builder).toContain('router.push(returnTo)');
    expect(builder).toContain("parseAppDestination(searchParams.get('returnTo'))");
  });
});

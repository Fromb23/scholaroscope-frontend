import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'app/core/components/lessonPlans/LessonPlansPage.tsx'),
  'utf8',
);

const archiveRouteSource = readFileSync(
  join(process.cwd(), 'app/(dashboard)/lesson-plans/archive/page.tsx'),
  'utf8',
);

describe('LessonPlansPage archive and grouping architecture', () => {
  it('has an explicit archive route that reuses the lesson plans page architecture', () => {
    expect(archiveRouteSource).toContain('<LessonPlansPage archiveMode');
    expect(pageSource).toContain("workspacePath = archiveMode ? '/lesson-plans/archive' : '/lesson-plans'");
  });

  it('queries archived lesson plans only for archive mode and excludes them from active mode', () => {
    expect(pageSource).toContain("status: archiveMode ? 'ARCHIVED' as LessonPlanStatus : statusFilter || undefined");
    expect(pageSource).toContain("archiveMode && lessonPlan.status !== 'ARCHIVED'");
    expect(pageSource).toContain("!archiveMode && lessonPlan.status === 'ARCHIVED'");
  });

  it('uses shared grouping and collapsible group state', () => {
    expect(pageSource).toContain('buildLessonPlanGroups');
    expect(pageSource).toContain('openGroupKeys');
    expect(pageSource).toContain('aria-expanded={isOpen}');
    expect(pageSource).toContain('toggleGroup(group.key)');
  });

  it('keeps archive cards out of active workflow actions', () => {
    expect(pageSource).toContain('archiveOnly={archiveMode}');
    expect(pageSource).toContain('archiveOnly ?');
    expect(pageSource).toContain('Restore');
  });
});

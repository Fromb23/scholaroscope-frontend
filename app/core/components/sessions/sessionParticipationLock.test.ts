import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('session participation lock', () => {
  it('passes a locked link-management flag and completed/cancelled reason to participating classes', () => {
    const detailSource = readFileSync(join(process.cwd(), 'app/core/components/sessions/SessionDetailPage.tsx'), 'utf8');
    const cohortsSource = readFileSync(join(process.cwd(), 'app/core/components/sessions/ParticipatingCohorts.tsx'), 'utf8');

    expect(detailSource).toContain('!isCompleted && !isCancelled');
    expect(detailSource).toContain('Completed lessons cannot be relinked. Attendance and evidence records are preserved.');
    expect(detailSource).toContain('lockedReason={participatingCohortsLockedReason}');
    expect(cohortsSource).toContain('lockedReason?: string');
    expect(cohortsSource).toContain('Add participating class');
    expect(cohortsSource).toContain('!isHistorical && canManageLinks');
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app/core/hooks/useSessions.ts'),
  'utf8',
);

describe('session operational request contract', () => {
  it('loads detail, attendance, and closure state through one composed request', () => {
    const detailHook = source.slice(
      source.indexOf('export const useSessionDetail'),
      source.indexOf('export const useCohortSessions'),
    );
    const fetchBlock = detailHook.slice(
      detailHook.indexOf('const fetchSession'),
      detailHook.indexOf('useEffect(() => { fetchSession();'),
    );

    expect(fetchBlock).toContain('sessionAPI.getById');
    expect(fetchBlock).not.toContain('sessionAPI.getAttendanceRecords');
    expect(fetchBlock).not.toContain('sessionAPI.getClosureState');
  });

  it('applies authoritative mutation responses without detail refetches', () => {
    const detailHook = source.slice(
      source.indexOf('export const useSessionDetail'),
      source.indexOf('export const useCohortSessions'),
    );

    for (const mutation of [
      'markAttendance',
      'startSession',
      'completeSession',
      'cancelSession',
      'rescheduleSession',
      'confirmTaughtOutcomes',
      'recordDelivery',
    ]) {
      const start = detailHook.indexOf(`const ${mutation}`);
      const end = detailHook.indexOf('\n  };', start);
      const block = detailHook.slice(start, end);
      expect(block).toContain('applySessionDetail');
      expect(block).not.toContain('await fetchSession');
    }
  });

  it('does not pair a composed detail refresh with a closure-state refresh', () => {
    for (const relativePath of [
      'app/core/components/sessions/SessionDetailPage.tsx',
      'app/plugins/cbc/components/teaching/CBCPracticalPage.tsx',
      'app/plugins/cbc/components/teaching/CBCFineArtsPracticalPage.tsx',
    ]) {
      const component = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      expect(component).not.toContain('Promise.all([refetch(), refetchClosureState()])');
      expect(component).not.toMatch(/await refetch\(\);\s*\n\s*.*refetchClosureState\(\)/);
    }
  });
});

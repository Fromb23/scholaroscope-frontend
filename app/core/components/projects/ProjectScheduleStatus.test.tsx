import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectSchedule } from '@/app/core/types/projects';
import { ProjectScheduleStatus } from './ProjectScheduleStatus';

const labels: Record<ProjectSchedule['urgency'], string> = {
  SCHEDULED: 'Scheduled',
  NORMAL: 'On schedule',
  ATTENTION: 'Deadline approaching',
  URGENT: 'Urgent: deadline approaching',
  CRITICAL: 'Critical deadline warning',
  DUE_TODAY: 'Due today',
  OVERDUE: 'Deadline passed',
  CLOSED: 'Project closed',
};

function schedule(urgency: ProjectSchedule['urgency']): ProjectSchedule {
  return {
    status: urgency,
    urgency,
    timezone: 'Africa/Nairobi',
    starts_at: '2026-02-01T08:00:00+03:00',
    deadline_at: '2026-10-01T17:00:00+03:00',
    total_duration_seconds: 20_952_000,
    elapsed_duration_seconds: 10_476_000,
    elapsed_percentage: 50,
    remaining_seconds: urgency === 'DUE_TODAY' ? 21_600 : 10_476_000,
    remaining_calendar_days: 121,
  };
}

describe('ProjectScheduleStatus', () => {
  const clearInterval = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('window', { setInterval: vi.fn(() => 7), clearInterval });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    clearInterval.mockReset();
  });

  for (const urgency of Object.keys(labels) as ProjectSchedule['urgency'][]) {
    it(`renders authoritative ${urgency} status with text and an accessible label`, () => {
      let renderer: ReactTestRenderer;
      act(() => { renderer = create(<ProjectScheduleStatus schedule={schedule(urgency)} />); });
      const output = JSON.stringify(renderer!.toJSON());
      expect(output).toContain(labels[urgency]);
      expect(renderer!.root.findAll((node) => typeof node.props['aria-label'] === 'string').length).toBeGreaterThan(0);
      expect(output).toContain('Elapsed project time');
      expect(output).toContain('% of scheduled project time elapsed');
      if (urgency === 'DUE_TODAY') expect(output).toContain('6h 0m');
      if (urgency === 'SCHEDULED') expect(output).toContain('2/1/2026');
      act(() => renderer!.unmount());
    });
  }

  it('cleans up its visible-clock interval on unmount', () => {
    let renderer: ReactTestRenderer;
    act(() => { renderer = create(<ProjectScheduleStatus schedule={schedule('NORMAL')} />); });
    act(() => renderer!.unmount());
    expect(clearInterval).toHaveBeenCalledWith(7);
  });
});

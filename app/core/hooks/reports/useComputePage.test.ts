import { describe, expect, it, vi } from 'vitest';

import { activeJobFromConflict, waitForPersistedTerminalJob } from './useComputePage';
import type { AppError } from '@/app/core/errors';
import type { ReportComputeJob } from '@/app/core/types/reporting';

function job(status: ReportComputeJob['status']): ReportComputeJob {
  return {
    job_id: 'job-1',
    status,
    mode: 'FINAL_RECONCILIATION',
    stage: status.toLowerCase(),
    progress_percent: status === 'COMPLETED' ? 100 : 75,
  };
}

describe('persisted compute job monitoring', () => {
  it('continues polling after a temporary RUNNING snapshot and stops at durable completion', async () => {
    const getJob = vi.fn()
      .mockResolvedValueOnce(job('RUNNING'))
      .mockResolvedValueOnce(job('COMPLETED'));
    const snapshots: string[] = [];

    const result = await waitForPersistedTerminalJob({
      jobId: 'job-1',
      getJob,
      immediate: true,
      maxAttempts: 3,
      delay: async () => undefined,
      onSnapshot: (snapshot) => snapshots.push(snapshot.status),
    });

    expect(result?.status).toBe('COMPLETED');
    expect(snapshots).toEqual(['RUNNING', 'COMPLETED']);
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it('stops updates when monitoring is aborted on unmount', async () => {
    const controller = new AbortController();
    const getJob = vi.fn(async () => job('RUNNING'));
    const delay = vi.fn(async () => {
      controller.abort();
    });

    const result = await waitForPersistedTerminalJob({
      jobId: 'job-1',
      getJob,
      signal: controller.signal,
      maxAttempts: 3,
      delay,
    });

    expect(result).toBeNull();
    expect(getJob).not.toHaveBeenCalled();
  });

  it('identifies the active term job from a cross-mode conflict', () => {
    const active = job('RUNNING');
    active.mode = 'FULL_REBUILD';
    const conflict: AppError = {
      kind: 'conflict',
      title: 'Conflict',
      message: 'Another operation is active.',
      retryable: false,
      severity: 'warning',
      serverCode: 'report_compute_conflict',
      serverContext: {
        active_job_id: active.job_id,
        active_mode: active.mode,
        active_job: active,
      },
    };

    expect(activeJobFromConflict(conflict)).toEqual(active);
  });
});

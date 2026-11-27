import { afterEach, describe, expect, it, vi } from 'vitest';

import { pollGenerationJob } from './pollGenerationJob';

afterEach(() => {
  vi.useRealTimers();
});

describe('pollGenerationJob', () => {
  it('does not poll an already completed durable result', async () => {
    const getJob = vi.fn();

    const result = await pollGenerationJob({
      initial: { status: 'COMPLETED', value: 7 },
      getJob,
      maxPolls: 60,
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ status: 'COMPLETED', value: 7 });
    expect(getJob).not.toHaveBeenCalled();
  });

  it('uses a bounded slower interval while provider work is processing', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const getJob = vi.fn()
      .mockResolvedValueOnce({ status: 'PROCESSING' })
      .mockResolvedValueOnce({ status: 'COMPLETED' });
    const pending = pollGenerationJob({
      initial: { status: 'QUEUED' },
      getJob,
      maxPolls: 10,
      signal: controller.signal,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(getJob).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_499);
    expect(getJob).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual({ status: 'COMPLETED' });
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it('cancels the timer and prevents another HTTP request', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const getJob = vi.fn();
    const pending = pollGenerationJob({
      initial: { status: 'QUEUED' },
      getJob,
      maxPolls: 60,
      signal: controller.signal,
    });

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.runAllTimersAsync();
    expect(getJob).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cohortsAPI } from '@/app/core/api/cohorts';
import { apiClient } from '@/app/core/api/client';

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('cohorts API cohort-subject routes', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset().mockResolvedValue({ data: [] });
  });

  it('loads cohort subjects from the flat backend route', async () => {
    await cohortsAPI.getCohortSubjects(9);

    expect(apiClient.get).toHaveBeenCalledWith('/cohort-subjects/', {
      params: { cohort: 9 },
    });
  });
});

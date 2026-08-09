import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  adminReportsAPI,
  cohortSubjectReportsAPI,
  instructorReportsAPI,
} from '@/app/core/api/reporting';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/app/core/api/client', () => ({
  apiClient: { get },
}));

describe('report authority propagation', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: {} });
  });

  it('sends supervision for management report requests', async () => {
    await adminReportsAPI.getOverview(7, 'supervision');

    expect(get).toHaveBeenCalledWith('/reports/admin/overview/', {
      params: { term_id: 7, authority_mode: 'supervision' },
    });
  });

  it('changes canonical and instructor calls when the context authority changes', async () => {
    await cohortSubjectReportsAPI.getOverview(3, {
      termId: 7,
      authorityMode: 'supervision',
    });
    await instructorReportsAPI.getOverview('teaching');

    expect(get).toHaveBeenNthCalledWith(1, '/reporting/cohort-subjects/3/overview/', {
      params: { term_id: 7, authority_mode: 'supervision' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/reports/instructor/overview/', {
      params: { authority_mode: 'teaching' },
    });
  });
});

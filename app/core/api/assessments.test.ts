import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rubricLevelAPI, rubricScaleAPI } from '@/app/core/api/assessments';
import { apiClient } from '@/app/core/api/client';

vi.mock('@/app/core/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('assessment rubric API routes', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset().mockResolvedValue({ data: [] });
    vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} });
    vi.mocked(apiClient.patch).mockReset().mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockReset().mockResolvedValue({ data: undefined });
  });

  it('uses flat backend routes for rubric scales and custom actions', async () => {
    await rubricScaleAPI.getAll({ curriculum: 3, is_active: true });
    await rubricScaleAPI.getById(12);
    await rubricScaleAPI.getActive();
    await rubricScaleAPI.getByCurriculum(3);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/rubric-scales/', {
      params: { curriculum: 3, is_active: true },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/rubric-scales/12/');
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/rubric-scales/active/');
    expect(apiClient.get).toHaveBeenNthCalledWith(4, '/rubric-scales/by_curriculum/', {
      params: { curriculum_id: 3 },
    });
  });

  it('uses flat backend routes for rubric scale mutations', async () => {
    await rubricScaleAPI.create({ name: 'CBC' });
    await rubricScaleAPI.update(12, { name: 'Updated' });
    await rubricScaleAPI.delete(12);

    expect(apiClient.post).toHaveBeenCalledWith('/rubric-scales/', { name: 'CBC' });
    expect(apiClient.patch).toHaveBeenCalledWith('/rubric-scales/12/', { name: 'Updated' });
    expect(apiClient.delete).toHaveBeenCalledWith('/rubric-scales/12/');
  });

  it('uses flat backend routes for rubric levels', async () => {
    await rubricLevelAPI.getAll(12);
    await rubricLevelAPI.create({ label: 'Meeting' });
    await rubricLevelAPI.update(4, { label: 'Exceeding' });
    await rubricLevelAPI.delete(4);

    expect(apiClient.get).toHaveBeenCalledWith('/rubric-levels/', {
      params: { rubric_scale: 12 },
    });
    expect(apiClient.post).toHaveBeenCalledWith('/rubric-levels/', { label: 'Meeting' });
    expect(apiClient.patch).toHaveBeenCalledWith('/rubric-levels/4/', { label: 'Exceeding' });
    expect(apiClient.delete).toHaveBeenCalledWith('/rubric-levels/4/');
  });
});

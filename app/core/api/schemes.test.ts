import { beforeEach, describe, expect, it, vi } from 'vitest';

import { schemesAPI } from '@/app/core/api/schemes';

const { get, post, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  deleteRequest: vi.fn(),
}));

vi.mock('@/app/core/api/client', () => ({
  apiClient: { get, post, delete: deleteRequest },
}));

describe('scheme application API', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    deleteRequest.mockReset();
  });

  it('uses the server-authorized compatibility and atomic application endpoints', async () => {
    get.mockResolvedValue({ data: [{ id: 22, cohort_name: 'Grade 10 Green' }] });
    post.mockResolvedValue({ data: [{ id: 9, cohort_subject: 22 }] });

    await expect(schemesAPI.getCompatibleCohortSubjects(4)).resolves.toEqual([
      { id: 22, cohort_name: 'Grade 10 Green' },
    ]);
    await expect(schemesAPI.applyToCohortSubjects(4, [22, 23])).resolves.toEqual([
      { id: 9, cohort_subject: 22 },
    ]);

    expect(get).toHaveBeenCalledWith('/schemes/4/compatible-cohort-subjects/');
    expect(post).toHaveBeenCalledWith('/schemes/4/applications/', {
      cohort_subject_ids: [22, 23],
    });
  });

  it('detaches by application identity without deleting the scheme document', async () => {
    deleteRequest.mockResolvedValue({});

    await schemesAPI.detachApplication(4, 9);

    expect(deleteRequest).toHaveBeenCalledWith('/schemes/4/applications/9/');
  });
});

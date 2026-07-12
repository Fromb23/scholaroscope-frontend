import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { academicKeys } from '@/app/core/lib/queryKeys';

type LearnerRow = {
  id: number;
  full_name: string;
  organization_id: number;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function cachedPayload(queryClient: QueryClient): string {
  return JSON.stringify(
    queryClient.getQueryCache().getAll().map((query) => query.state.data),
  );
}

describe('runtime tenant cache boundaries', () => {
  it('organization switch clears previous organization learner data before loading the next organization', async () => {
    const queryClient = createQueryClient();
    const learnerListKey = academicKeys.students.all;
    const orgALearners: LearnerRow[] = [
      { id: 101, full_name: 'Amina Org A', organization_id: 1 },
    ];
    const orgBLearners: LearnerRow[] = [
      { id: 202, full_name: 'Brian Org B', organization_id: 2 },
    ];

    await queryClient.fetchQuery({
      queryKey: learnerListKey,
      queryFn: async () => orgALearners,
    });

    expect(cachedPayload(queryClient)).toContain('Amina Org A');

    queryClient.clear();

    await queryClient.fetchQuery({
      queryKey: learnerListKey,
      queryFn: async () => orgBLearners,
    });

    const cache = cachedPayload(queryClient);
    expect(cache).toContain('Brian Org B');
    expect(cache).not.toContain('Amina Org A');
    expect(cache).not.toContain('"organization_id":1');
  });

  it('late previous-organization responses cannot repopulate the active organization cache', async () => {
    const queryClient = createQueryClient();
    const learnerListKey = academicKeys.students.all;
    const orgARequest = deferred<LearnerRow[]>();
    const orgALearners: LearnerRow[] = [
      { id: 101, full_name: 'Amina Org A', organization_id: 1 },
    ];
    const orgBLearners: LearnerRow[] = [
      { id: 202, full_name: 'Brian Org B', organization_id: 2 },
    ];

    const staleFetch = queryClient.fetchQuery({
      queryKey: learnerListKey,
      queryFn: () => orgARequest.promise,
    });

    queryClient.clear();

    await queryClient.fetchQuery({
      queryKey: learnerListKey,
      queryFn: async () => orgBLearners,
    });

    orgARequest.resolve(orgALearners);
    const staleOutcome = await staleFetch.then(
      () => 'resolved',
      (error: unknown) => error,
    );

    const cache = cachedPayload(queryClient);
    expect(staleOutcome).not.toBe('resolved');
    expect(cache).toContain('Brian Org B');
    expect(cache).not.toContain('Amina Org A');
    expect(queryClient.getQueryData(learnerListKey)).toEqual(orgBLearners);
  });
});

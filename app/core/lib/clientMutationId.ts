export type MutationSyncStatus = 'pending' | 'synced' | 'conflict' | 'failed';

export interface ClientMutationFields {
    clientMutationId?: string;
    syncStatus?: MutationSyncStatus;
}

const generatedMutationIds = new WeakMap<object, string>();

export function createClientMutationId(prefix = 'mutation'): string {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    return `${prefix}:${randomId}`;
}

export function getStableClientMutationId(scope: object, prefix = 'mutation'): string {
    const existing = generatedMutationIds.get(scope);

    if (existing) {
        return existing;
    }

    const next = createClientMutationId(prefix);
    generatedMutationIds.set(scope, next);
    return next;
}

export function withClientMutationId<T extends object>(
    payload: T,
    prefix = 'mutation'
): T & { clientMutationId: string } {
    const requestPayload = { ...payload } as T & Partial<ClientMutationFields>;
    delete (requestPayload as { syncStatus?: unknown }).syncStatus;

    const existing = requestPayload.clientMutationId;

    if (typeof existing === 'string' && existing.trim().length > 0) {
        return requestPayload as T & { clientMutationId: string };
    }

    const generated = getStableClientMutationId(payload, prefix);

    return {
        ...requestPayload,
        clientMutationId: generated,
    };
}

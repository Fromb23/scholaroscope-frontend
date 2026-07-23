import type { ApiError } from '@/app/core/types/errors';

function getResponseStatus(error: unknown): number | null {
    const visited = new Set<unknown>();
    let current: unknown = error;

    while (current && !visited.has(current)) {
        visited.add(current);
        const status = (current as ApiError | undefined)?.response?.status;
        if (typeof status === 'number') {
            return status;
        }
        current = (current as { cause?: unknown }).cause;
    }

    return null;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
    const status = getResponseStatus(error);

    if (status === 401 || status === 403 || status === 404) {
        return false;
    }

    if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
    }

    return failureCount < 2;
}

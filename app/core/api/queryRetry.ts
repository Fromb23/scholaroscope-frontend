import type { ApiError } from '@/app/core/types/errors';

function getResponseStatus(error: unknown): number | null {
    const status = (error as ApiError | undefined)?.response?.status;
    return typeof status === 'number' ? status : null;
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

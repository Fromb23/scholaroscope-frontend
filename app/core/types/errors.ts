// ============================================================================
// app/core/types/errors.ts
//
// Global error types — replaces all `any` in catch blocks.
// Use ApiError everywhere an API call can fail.
// ============================================================================

export interface ApiErrorDetail {
    [field: string]: string | string[];
}

export interface ApiStructuredError {
    type?: string;
    code?: string;
    message?: string;
    next_action?: string;
}

export type ApiErrorResponseData =
    | ApiErrorDetail
    | string
    | string[]
    | {
        error?: ApiStructuredError;
        message?: string;
        requires_attendance?: boolean;
    };

export interface ApiError {
    response?: {
        data?: ApiErrorResponseData;
        status?: number;
    };
    message?: string;
}

/**
 * Extracts a human-readable error message from an API error response.
 * Handles all DRF error shapes:
 *   - { field: ["error"] }      → field-level validation errors
 *   - { detail: "error" }       → single message
 *   - ["error1", "error2"]      → list of errors
 *   - "plain string"            → raw string
 */
export function extractErrorMessage(err: ApiError, fallback = 'An error occurred'): string {
    const data = err?.response?.data;

    if (!data) return err?.message ?? fallback;

    if (Array.isArray(data)) return data.join('\n');

    if (typeof data === 'string') return data;

    if (typeof data === 'object') {
        const structuredError = 'error' in data ? data.error : undefined;
        if (
            structuredError
            && typeof structuredError === 'object'
            && !Array.isArray(structuredError)
            && typeof structuredError.message === 'string'
        ) {
            return structuredError.message;
        }
        if ('message' in data && typeof data.message === 'string') {
            return data.message;
        }
        return Object.values(data)
            .flat()
            .join('\n');
    }

    return fallback;
}

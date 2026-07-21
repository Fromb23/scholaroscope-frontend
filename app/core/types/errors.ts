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
export function extractErrorCode(err: ApiError): string | null {
    const data = err?.response?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const structuredError = 'error' in data ? data.error : undefined;
    if (
        structuredError
        && typeof structuredError === 'object'
        && !Array.isArray(structuredError)
        && typeof structuredError.code === 'string'
    ) {
        return structuredError.code;
    }
    return null;
}

export type ApiErrorWithCode = Error & {
    code?: string | null;
    response?: ApiError['response'];
};

export { resolveErrorMessage } from '@/app/core/errors/resolveErrorMessage';

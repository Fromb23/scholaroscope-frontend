import type { ApiError } from '@/app/core/types/errors';

export function getDownloadFileName(
    headerValue: string | undefined,
    fallback: string,
): string {
    if (!headerValue) {
        return fallback;
    }

    const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]).replace(/^"(.*)"$/, '$1');
    }

    const asciiMatch = headerValue.match(/filename="?([^";]+)"?/i);
    if (asciiMatch?.[1]) {
        return asciiMatch[1];
    }

    return fallback;
}

export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export async function normalizeBlobError(error: unknown): Promise<never> {
    const apiError = error as ApiError & {
        response?: {
            data?: Blob | string | Record<string, unknown>;
            status?: number;
        };
    };
    const data = apiError.response?.data;

    if (data instanceof Blob) {
        const rawText = await data.text();
        let parsedData: NonNullable<ApiError['response']>['data'] = rawText;

        try {
            parsedData = JSON.parse(rawText) as NonNullable<ApiError['response']>['data'];
        } catch {
            parsedData = rawText;
        }

        throw {
            ...apiError,
            response: {
                ...apiError.response,
                data: parsedData,
            },
        } satisfies ApiError;
    }

    throw error;
}

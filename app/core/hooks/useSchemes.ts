'use client';

import { useCallback, useEffect, useState } from 'react';
import { schemesAPI } from '@/app/core/api/schemes';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';
import type {
    GenerateSchemePayload,
    SchemeEntry,
    SchemeEntryUpdatePayload,
    SchemeListQueryParams,
    SchemeOfWork,
    SchemeSubjectStrandOption,
    SchemeUpdatePayload,
    SchemeWeek,
    SchemeWeekUpdatePayload,
} from '@/app/core/types/schemes';

function unwrapSchemes(data: SchemeOfWork[] | { results?: SchemeOfWork[] }): SchemeOfWork[] {
    return Array.isArray(data) ? data : data?.results ?? [];
}

function getSchemeListMessage(error: ApiError): string {
    return extractErrorMessage(error, 'We could not load schemes of work. Try again.');
}

function getSchemeDetailMessage(error: ApiError): string {
    const status = error?.response?.status;

    if (status === 403) {
        return 'You do not have access to this scheme of work.';
    }

    if (status === 404) {
        return 'This scheme of work could not be found.';
    }

    return extractErrorMessage(error, 'We could not load this scheme of work. Try again.');
}

export function useSchemes(params?: SchemeListQueryParams) {
    const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSchemes = useCallback(async () => {
        try {
            setLoading(true);
            const data = await schemesAPI.listSchemes(params);
            setSchemes(unwrapSchemes(data));
            setError(null);
        } catch (err) {
            setSchemes([]);
            setError(getSchemeListMessage(err as ApiError));
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        void fetchSchemes();
    }, [fetchSchemes]);

    const downloadScheme = async (id: number): Promise<void> => {
        try {
            await schemesAPI.triggerSchemeDownload(id);
        } catch (err) {
            throw new Error(
                extractErrorMessage(err as ApiError, 'Could not download the scheme of work.'),
            );
        }
    };

    return {
        schemes,
        loading,
        error,
        refetch: fetchSchemes,
        downloadScheme,
    };
}

export function useGenerateScheme() {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateScheme = async (payload: GenerateSchemePayload): Promise<SchemeOfWork> => {
        try {
            setSubmitting(true);
            setError(null);
            return await schemesAPI.generateScheme(payload);
        } catch (err) {
            const message = extractErrorMessage(
                err as ApiError,
                'We could not generate the draft scheme.',
            );
            setError(message);
            throw new Error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        generateScheme,
        submitting,
        error,
        clearError: () => setError(null),
    };
}

export function useSchemeSubjectStrands(subjectId: number | null) {
    const [strands, setStrands] = useState<SchemeSubjectStrandOption[]>([]);
    const [loading, setLoading] = useState(Boolean(subjectId));
    const [error, setError] = useState<string | null>(null);

    const fetchStrands = useCallback(async () => {
        if (!subjectId) {
            setStrands([]);
            setLoading(false);
            setError(null);
            return;
        }

        try {
            setLoading(true);
            const data = await schemesAPI.getSubjectStrands(subjectId);
            setStrands(data);
            setError(null);
        } catch (err) {
            setStrands([]);
            setError(
                extractErrorMessage(
                    err as ApiError,
                    'We could not load the strand range for this subject.',
                ),
            );
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        void fetchStrands();
    }, [fetchStrands]);

    return {
        strands,
        loading,
        error,
        refetch: fetchStrands,
    };
}

export function useSchemeDetail(schemeId: number | null) {
    const [scheme, setScheme] = useState<SchemeOfWork | null>(null);
    const [weeks, setWeeks] = useState<SchemeWeek[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScheme = useCallback(async () => {
        if (!schemeId) {
            setScheme(null);
            setWeeks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [schemeData, weekData] = await Promise.all([
                schemesAPI.getScheme(schemeId),
                schemesAPI.getSchemeWeeks(schemeId),
            ]);
            setScheme(schemeData);
            setWeeks(weekData);
            setError(null);
        } catch (err) {
            setScheme(null);
            setWeeks([]);
            setError(getSchemeDetailMessage(err as ApiError));
        } finally {
            setLoading(false);
        }
    }, [schemeId]);

    useEffect(() => {
        void fetchScheme();
    }, [fetchScheme]);

    const updateScheme = async (payload: SchemeUpdatePayload): Promise<SchemeOfWork> => {
        if (!schemeId) {
            throw new Error('No scheme selected.');
        }

        try {
            const updated = await schemesAPI.updateScheme(schemeId, payload);
            setScheme(updated);
            return updated;
        } catch (err) {
            throw new Error(getSchemeDetailMessage(err as ApiError));
        }
    };

    const updateWeek = async (
        weekId: number,
        payload: SchemeWeekUpdatePayload,
    ): Promise<SchemeWeek> => {
        try {
            const updated = await schemesAPI.updateWeek(weekId, payload);
            setWeeks((current) => current.map((week) => (
                week.id === updated.id ? updated : week
            )));
            return updated;
        } catch (err) {
            throw new Error(getSchemeDetailMessage(err as ApiError));
        }
    };

    const updateEntry = async (
        entryId: number,
        payload: SchemeEntryUpdatePayload,
    ): Promise<SchemeEntry> => {
        try {
            const updated = await schemesAPI.updateEntry(entryId, payload);
            setScheme((current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    entries: (current.entries ?? []).map((entry) => (
                        entry.id === updated.id ? updated : entry
                    )),
                };
            });
            return updated;
        } catch (err) {
            throw new Error(getSchemeDetailMessage(err as ApiError));
        }
    };

    const downloadScheme = async (): Promise<void> => {
        if (!schemeId) {
            throw new Error('No scheme selected.');
        }

        try {
            await schemesAPI.triggerSchemeDownload(schemeId);
        } catch (err) {
            throw new Error(
                extractErrorMessage(err as ApiError, 'Could not download the scheme of work.'),
            );
        }
    };

    return {
        scheme,
        weeks,
        loading,
        error,
        refetch: fetchScheme,
        updateScheme,
        updateWeek,
        updateEntry,
        downloadScheme,
    };
}

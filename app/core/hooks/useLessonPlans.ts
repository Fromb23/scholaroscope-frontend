'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { lessonPlanAPI } from '@/app/core/api/lessonPlans';
import type { PaginatedResponse } from '@/app/core/types/api';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type {
    GenerateLessonPlanPayload,
    GenerateLessonPlanResponse,
    LessonPlan,
    LessonPlanCreatePayload,
    LessonPlanQueryParams,
    LessonPlanUpdatePayload,
    MarkUsedPayload,
} from '@/app/core/types/lessonPlans';

function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
    return Array.isArray(data) ? data : data?.results ?? [];
}

function getStatusCode(error: ApiError): number | null {
    const status = error?.response?.status;
    return typeof status === 'number' ? status : null;
}

function getLessonPlanListMessage(error: ApiError): string {
    return extractErrorMessage(error, 'We could not load lesson plans. Try again.');
}

function getLessonPlanDetailMessage(error: ApiError): string {
    const status = getStatusCode(error);

    if (status === 403) {
        return 'You do not have access to this lesson plan.';
    }

    if (status === 404) {
        return 'This lesson plan could not be found.';
    }

    return extractErrorMessage(error, 'We could not load this lesson plan. Try again.');
}

function getLessonPlanCreateMessage(error: ApiError, fallback: string): string {
    const status = getStatusCode(error);

    if (status === 403) {
        return 'You cannot create a lesson plan for this session.';
    }

    return extractErrorMessage(error, fallback);
}

function replaceLessonPlan(items: LessonPlan[], updated: LessonPlan): LessonPlan[] {
    const nextItems = items.map((item) => (item.id === updated.id ? updated : item));

    if (nextItems.some((item) => item.id === updated.id)) {
        return nextItems;
    }

    return [updated, ...items];
}

export const useLessonPlans = (params?: LessonPlanQueryParams) => {
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);

    const requestFilters = useMemo(
        () => ({
            search: params?.search,
            status: params?.status,
            term: params?.term,
            subject: params?.subject,
            cohort: params?.cohort,
            session: params?.session,
            page: params?.page,
            page_size: params?.page_size,
            ordering: params?.ordering,
        }),
        [
            params?.cohort,
            params?.ordering,
            params?.page,
            params?.page_size,
            params?.search,
            params?.session,
            params?.status,
            params?.subject,
            params?.term,
        ]
    );

    const fetchLessonPlans = useCallback(async () => {
        try {
            setLoading(true);
            const data = await lessonPlanAPI.getAll(requestFilters);
            setLessonPlans(unwrapList(data));
            setError(null);
            setErrorStatus(null);
        } catch (err) {
            const apiError = err as ApiError;
            setLessonPlans([]);
            setError(getLessonPlanListMessage(apiError));
            setErrorStatus(getStatusCode(apiError));
        } finally {
            setLoading(false);
        }
    }, [requestFilters]);

    useEffect(() => {
        void fetchLessonPlans();
    }, [fetchLessonPlans]);

    const createLessonPlan = async (payload: LessonPlanCreatePayload): Promise<LessonPlan> => {
        try {
            const created = await lessonPlanAPI.create(payload);
            setLessonPlans((prev) => [created, ...prev]);
            return created;
        } catch (err) {
            throw new Error(
                getLessonPlanCreateMessage(err as ApiError, 'Failed to create lesson plan.')
            );
        }
    };

    const updateLessonPlan = async (id: number, payload: LessonPlanUpdatePayload): Promise<LessonPlan> => {
        try {
            const updated = await lessonPlanAPI.update(id, payload);
            setLessonPlans((prev) => replaceLessonPlan(prev, updated));
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const deleteLessonPlan = async (id: number): Promise<void> => {
        try {
            await lessonPlanAPI.delete(id);
            setLessonPlans((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const markReviewed = async (id: number): Promise<LessonPlan> => {
        try {
            const updated = await lessonPlanAPI.markReviewed(id);
            setLessonPlans((prev) => replaceLessonPlan(prev, updated));
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const markUsed = async (id: number, payload: MarkUsedPayload): Promise<LessonPlan> => {
        try {
            const updated = await lessonPlanAPI.markUsed(id, payload);
            setLessonPlans((prev) => replaceLessonPlan(prev, updated));
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const archive = async (id: number): Promise<LessonPlan> => {
        try {
            const updated = await lessonPlanAPI.archive(id);
            setLessonPlans((prev) => replaceLessonPlan(prev, updated));
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const restore = async (id: number): Promise<LessonPlan> => {
        try {
            const updated = await lessonPlanAPI.restore(id);
            setLessonPlans((prev) => replaceLessonPlan(prev, updated));
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    return {
        lessonPlans,
        loading,
        error,
        errorStatus,
        refetch: fetchLessonPlans,
        createLessonPlan,
        updateLessonPlan,
        deleteLessonPlan,
        markReviewed,
        markUsed,
        archive,
        restore,
    };
};

export const useLessonPlanDetail = (lessonPlanId: number | null) => {
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);

    const fetchLessonPlan = useCallback(async () => {
        if (!lessonPlanId) {
            setLessonPlan(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await lessonPlanAPI.getById(lessonPlanId);
            setLessonPlan(data);
            setError(null);
            setErrorStatus(null);
        } catch (err) {
            const apiError = err as ApiError;
            setLessonPlan(null);
            setError(getLessonPlanDetailMessage(apiError));
            setErrorStatus(getStatusCode(apiError));
        } finally {
            setLoading(false);
        }
    }, [lessonPlanId]);

    useEffect(() => {
        void fetchLessonPlan();
    }, [fetchLessonPlan]);

    const updateLessonPlan = async (payload: LessonPlanUpdatePayload): Promise<LessonPlan> => {
        if (!lessonPlanId) {
            throw new Error('This lesson plan could not be found.');
        }

        try {
            const updated = await lessonPlanAPI.update(lessonPlanId, payload);
            setLessonPlan(updated);
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const deleteLessonPlan = async (): Promise<void> => {
        if (!lessonPlanId) {
            throw new Error('This lesson plan could not be found.');
        }

        try {
            await lessonPlanAPI.delete(lessonPlanId);
            setLessonPlan(null);
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const markReviewed = async (): Promise<LessonPlan> => {
        if (!lessonPlanId) {
            throw new Error('This lesson plan could not be found.');
        }

        try {
            const updated = await lessonPlanAPI.markReviewed(lessonPlanId);
            setLessonPlan(updated);
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const markUsed = async (payload: MarkUsedPayload): Promise<LessonPlan> => {
        if (!lessonPlanId) {
            throw new Error('This lesson plan could not be found.');
        }

        try {
            const updated = await lessonPlanAPI.markUsed(lessonPlanId, payload);
            setLessonPlan(updated);
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const archive = async (): Promise<LessonPlan> => {
        if (!lessonPlanId) {
            throw new Error('This lesson plan could not be found.');
        }

        try {
            const updated = await lessonPlanAPI.archive(lessonPlanId);
            setLessonPlan(updated);
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    const restore = async (): Promise<LessonPlan> => {
        if (!lessonPlanId) {
            throw new Error('This lesson plan could not be found.');
        }

        try {
            const updated = await lessonPlanAPI.restore(lessonPlanId);
            setLessonPlan(updated);
            return updated;
        } catch (err) {
            throw new Error(getLessonPlanDetailMessage(err as ApiError));
        }
    };

    return {
        lessonPlan,
        loading,
        error,
        errorStatus,
        refetch: fetchLessonPlan,
        updateLessonPlan,
        deleteLessonPlan,
        markReviewed,
        markUsed,
        archive,
        restore,
    };
};

export const useGenerateLessonPlan = () => {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [result, setResult] = useState<GenerateLessonPlanResponse | null>(null);

    const generateLessonPlan = async (
        payload: GenerateLessonPlanPayload
    ): Promise<GenerateLessonPlanResponse> => {
        try {
            setSubmitting(true);
            setError(null);
            setErrorStatus(null);
            const response = await lessonPlanAPI.generate(payload);
            setResult(response);
            return response;
        } catch (err) {
            const apiError = err as ApiError;
            setResult(null);
            setError(getLessonPlanCreateMessage(apiError, 'Failed to generate lesson plan.'));
            setErrorStatus(getStatusCode(apiError));
            throw new Error(getLessonPlanCreateMessage(apiError, 'Failed to generate lesson plan.'));
        } finally {
            setSubmitting(false);
        }
    };

    return {
        generateLessonPlan,
        submitting,
        error,
        errorStatus,
        result,
        clearError: () => setError(null),
        clearResult: () => setResult(null),
    };
};

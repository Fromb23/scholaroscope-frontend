// ============================================================================
// app/hooks/useRequests.ts
// ============================================================================

import { useCallback, useState, useEffect } from 'react';
import {
    Request, RequestDetail, RequestCreatePayload,
    RequestReviewPayload, RequestType, RequestStats,
} from '@/app/plugins/requests/types/requests';
import { requestsAPI, type RequestListParams } from '@/app/plugins/requests/api/requests';
import { ApiError, resolveErrorMessage } from '@/app/core/types/errors';
import { buildContextualRequestKey, getCurrentApprovalRoute } from '@/app/plugins/requests/lib/approvalIntents';

type PaginatedResponse<T> = { results?: T[] };
type RequestApiError = {
    detail?: string;
    response?: { data?: { request_type?: string[]; detail?: string; message?: string } };
};

function getApiError(err: unknown): RequestApiError {
    return err as RequestApiError;
}

function buildRequestListParams(
    status?: string,
    requestType?: string,
    priority?: string
): RequestListParams | undefined {
    const params: RequestListParams = {};
    if (status) params.status = status;
    if (requestType) params.request_type = requestType;
    if (priority) params.priority = priority;
    return Object.keys(params).length > 0 ? params : undefined;
}

type UseRequestsParams = RequestListParams;

export const useRequests = ({
    status,
    request_type: requestType,
    priority,
}: UseRequestsParams = {}) => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const data = await requestsAPI.getAll(buildRequestListParams(status, requestType, priority));
            const arr = Array.isArray(data) ? data : (data as PaginatedResponse<Request>).results ?? [];
            setRequests(arr);
            setError(null);
        } catch (err: unknown) {
            setError(getApiError(err).detail || 'Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    }, [priority, requestType, status]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const createRequest = async (data: RequestCreatePayload) => {
        try {
            const newReq = await requestsAPI.create(data);
            setRequests(prev => [newReq, ...prev]);
            return newReq;
        } catch (err: unknown) {
            const error = getApiError(err);
            throw new Error(
                error.response?.data?.request_type?.[0] ||
                error.response?.data?.detail ||
                error.response?.data?.message ||
                'Failed to submit request'
            );
        }
    };

    const reviewRequest = async (id: number, data: RequestReviewPayload) => {
        try {
            const updated = await requestsAPI.review(id, data);
            setRequests(prev => prev.map(r => r.id === id ? updated : r));
            return updated;
        } catch (err: unknown) {
            throw new Error(getApiError(err).response?.data?.detail || 'Failed to update request');
        }
    };

    const deleteRequest = async (id: number) => {
        try {
            await requestsAPI.delete(id);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err: unknown) {
            throw new Error(getApiError(err).response?.data?.detail || 'Failed to delete request');
        }
    };

    return {
        requests, loading, error,
        refetch: fetchRequests,
        createRequest, reviewRequest, deleteRequest,
    };
};

export const useRequestDetail = (id: number | null) => {
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequest = useCallback(async () => {
        if (!id) { setLoading(false); return; }
        try {
            setLoading(true);
            const data = await requestsAPI.getById(id);
            setRequest(data);
            setError(null);
        } catch (err: unknown) {
            setError(getApiError(err).detail || 'Failed to fetch request');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchRequest(); }, [fetchRequest]);

    const addComment = async (content: string, is_internal: boolean) => {
        if (!id || !request) return;
        try {
            const comment = await requestsAPI.addComment(id, { content, is_internal });
            setRequest(prev => prev ? {
                ...prev,
                comments: [...prev.comments, comment],
                comment_count: prev.comment_count + 1,
            } : prev);
            return comment;
        } catch (err: unknown) {
            throw new Error(getApiError(err).response?.data?.detail || 'Failed to add comment');
        }
    };

    const reviewRequest = async (data: RequestReviewPayload) => {
        if (!id || !request) return;
        try {
            const updated = await requestsAPI.review(id, data);
            setRequest(prev => prev ? { ...prev, ...updated } : prev);
            return updated;
        } catch (err: unknown) {
            throw new Error(getApiError(err).response?.data?.detail || 'Failed to update request');
        }
    };

    const executeRequest = async (retry = false) => {
        if (!id || !request) return;
        try {
            const updated = retry
                ? await requestsAPI.retryExecution(id)
                : await requestsAPI.execute(id);
            setRequest(prev => prev ? { ...prev, ...updated } : prev);
            return updated;
        } catch (err: unknown) {
            throw new Error(getApiError(err).response?.data?.detail || 'Failed to execute request');
        }
    };

    return {
        request, loading, error,
        refetch: fetchRequest,
        addComment, reviewRequest, executeRequest,
        setRequest,
    };
};

export const useRequestStats = () => {
    const [stats, setStats] = useState<RequestStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        requestsAPI.getStats()
            .then(data => { setStats(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return { stats, loading };
};

export const useMyRequests = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await requestsAPI.getAll();
            setRequests(data);
            setError(null);
        } catch (err) {
            setError(resolveErrorMessage(err as ApiError, 'Failed to load requests'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const submitDeletionRequest = async (
        type: Extract<RequestType, 'ACCOUNT_DELETION' | 'ORG_DELETION'>,
        reason: string
    ): Promise<Request> => {
        const titles: Record<string, string> = {
            ACCOUNT_DELETION: 'Account Deletion Request',
            ORG_DELETION: 'Organization Deletion Request',
        };
        try {
            const newRequest = await requestsAPI.create({
                title: titles[type],
                description: reason,
                request_type: type,
                action_key: type,
                priority: 'NORMAL' as const,
                origin_route: getCurrentApprovalRoute(),
                return_to: getCurrentApprovalRoute(),
                target_type: type === 'ACCOUNT_DELETION' ? 'account' : 'organization',
                request_key: buildContextualRequestKey(['profile', type.toLowerCase()]),
                reference_data: {
                    contextual_action: type === 'ACCOUNT_DELETION' ? 'account_deletion' : 'organization_deletion',
                    reason,
                },
            });
            setRequests(prev => [newRequest, ...prev]);
            return newRequest;
        } catch (err) {
            throw new Error(resolveErrorMessage(err as ApiError, 'Failed to submit deletion request'));
        }
    };

    const hasPendingDeletion = (
        type: Extract<RequestType, 'ACCOUNT_DELETION' | 'ORG_DELETION'>
    ): boolean =>
        Array.isArray(requests) &&
        requests.some(r => r.request_type === type && ['PENDING', 'IN_REVIEW'].includes(r.status));

    return { requests, loading, error, refetch: fetchRequests, submitDeletionRequest, hasPendingDeletion };
};

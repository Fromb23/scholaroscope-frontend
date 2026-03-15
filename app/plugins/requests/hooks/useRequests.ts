// ============================================================================
// app/hooks/useRequests.ts
// ============================================================================

import { useState, useEffect } from 'react';
import {
    Request, RequestDetail, RequestCreatePayload,
    RequestReviewPayload, AddCommentPayload, RequestStats,
} from '@/app/plugins/requests/types/requests';
import { requestsAPI } from '@/app/plugins/requests/api/requests';

export const useRequests = (params?: Record<string, string>) => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await requestsAPI.getAll(params);
            const arr = Array.isArray(data) ? data : (data as any).results ?? [];
            setRequests(arr);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [JSON.stringify(params)]);

    const createRequest = async (data: RequestCreatePayload) => {
        try {
            const newReq = await requestsAPI.create(data);
            setRequests(prev => [newReq, ...prev]);
            return newReq;
        } catch (err: any) {
            throw new Error(
                err.response?.data?.request_type?.[0] ||
                err.response?.data?.detail ||
                err.response?.data?.message ||
                'Failed to submit request'
            );
        }
    };

    const reviewRequest = async (id: number, data: RequestReviewPayload) => {
        try {
            const updated = await requestsAPI.review(id, data);
            setRequests(prev => prev.map(r => r.id === id ? updated : r));
            return updated;
        } catch (err: any) {
            throw new Error(err.response?.data?.detail || 'Failed to update request');
        }
    };

    const deleteRequest = async (id: number) => {
        try {
            await requestsAPI.delete(id);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            throw new Error(err.response?.data?.detail || 'Failed to delete request');
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

    const fetchRequest = async () => {
        if (!id) { setLoading(false); return; }
        try {
            setLoading(true);
            const data = await requestsAPI.getById(id);
            setRequest(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch request');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequest(); }, [id]);

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
        } catch (err: any) {
            throw new Error(err.response?.data?.detail || 'Failed to add comment');
        }
    };

    const reviewRequest = async (data: RequestReviewPayload) => {
        if (!id || !request) return;
        try {
            const updated = await requestsAPI.review(id, data);
            setRequest(prev => prev ? { ...prev, ...updated } : prev);
            return updated;
        } catch (err: any) {
            throw new Error(err.response?.data?.detail || 'Failed to update request');
        }
    };

    return {
        request, loading, error,
        refetch: fetchRequest,
        addComment, reviewRequest,
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
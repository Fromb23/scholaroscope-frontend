// ============================================================================
// core/hooks/useTopics.ts
//
// Hooks for Topic / Subtopic / Coverage.
// Follows useAcademic.ts pattern exactly:
//   - useState + useEffect per resource
//   - organizationId from OrganizationContext
//   - CRUD methods returned alongside state
//   - errors thrown with err.response?.data?.message fallback
// ============================================================================

import { useState, useEffect } from 'react';
import { topicAPI, subtopicAPI, subtopicCoverageAPI } from '@/app/core/api/topics';
import {
    Topic,
    TopicDetail,
    Subtopic,
    SubtopicCoverage,
    CoverageProgress,
    TopicFormData,
    SubtopicFormData,
    TopicQueryParams,
} from '@/app/core/types/topics';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

// ── useTopics ─────────────────────────────────────────────────────────────

export const useTopics = (subjectId?: number) => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useOrganizationContext();

    const fetchTopics = async () => {
        try {
            setLoading(true);
            const params: TopicQueryParams = {};
            if (subjectId) params.subject = subjectId;
            if (organizationId) params.organization = organizationId;

            const data = await topicAPI.getAll(params);
            const topicsArray = Array.isArray(data)
                ? data
                : (data as any)?.results ?? [];
            setTopics(topicsArray);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch topics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, [subjectId, organizationId]);

    const createTopic = async (data: TopicFormData) => {
        try {
            const newTopic = await topicAPI.create(data);
            setTopics(prev => [...prev, newTopic].sort((a, b) => a.sequence - b.sequence));
            return newTopic;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to create topic');
        }
    };

    const updateTopic = async (id: number, data: Partial<TopicFormData>) => {
        try {
            const updated = await topicAPI.update(id, data);
            setTopics(prev => prev.map(t => t.id === id ? updated : t));
            return updated;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to update topic');
        }
    };

    const deleteTopic = async (id: number) => {
        try {
            await topicAPI.delete(id);
            setTopics(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to delete topic');
        }
    };

    return {
        topics,
        loading,
        error,
        refetch: fetchTopics,
        createTopic,
        updateTopic,
        deleteTopic,
    };
};

// ── useTopicDetail ────────────────────────────────────────────────────────

export const useTopicDetail = (topicId: number | null) => {
    const [topic, setTopic] = useState<TopicDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTopic = async () => {
        if (!topicId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await topicAPI.getById(topicId) as TopicDetail;
            setTopic(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch topic details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopic();
    }, [topicId]);

    return { topic, loading, error, refetch: fetchTopic };
};

// ── useSubtopics ──────────────────────────────────────────────────────────

export const useSubtopics = (topicId?: number) => {
    const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useOrganizationContext();

    const fetchSubtopics = async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {};
            if (topicId) params.topic = topicId;
            if (organizationId) params.organization = organizationId;

            const data = await subtopicAPI.getAll(params);
            const arr = Array.isArray(data) ? data : (data as any)?.results ?? [];
            setSubtopics(arr);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch subtopics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubtopics();
    }, [topicId, organizationId]);

    const createSubtopic = async (data: SubtopicFormData) => {
        try {
            const newSubtopic = await subtopicAPI.create(data);
            setSubtopics(prev =>
                [...prev, newSubtopic].sort((a, b) => a.sequence - b.sequence)
            );
            return newSubtopic;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to create subtopic');
        }
    };

    const updateSubtopic = async (id: number, data: Partial<SubtopicFormData>) => {
        try {
            const updated = await subtopicAPI.update(id, data);
            setSubtopics(prev => prev.map(s => s.id === id ? updated : s));
            return updated;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to update subtopic');
        }
    };

    const deleteSubtopic = async (id: number) => {
        try {
            await subtopicAPI.delete(id);
            setSubtopics(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to delete subtopic');
        }
    };

    return {
        subtopics,
        loading,
        error,
        refetch: fetchSubtopics,
        createSubtopic,
        updateSubtopic,
        deleteSubtopic,
    };
};

// ── useCoverageProgress ───────────────────────────────────────────────────

export const useCoverageProgress = (cohortSubjectId: number | null) => {
    const [progress, setProgress] = useState<CoverageProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProgress = async () => {
        if (!cohortSubjectId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await subtopicCoverageAPI.getProgress(cohortSubjectId);
            setProgress(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch coverage progress');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgress();
    }, [cohortSubjectId]);

    return { progress, loading, error, refetch: fetchProgress };
};
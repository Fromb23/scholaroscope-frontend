'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  sessionAPI,
  type SupervisionHierarchyQuery,
} from '@/app/core/hooks/useSessions';
import type {
  SupervisionCohortsResponse,
  SupervisionSessionSummary,
  SupervisionSubjectsResponse,
} from '@/app/core/types/session';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';

const subjectCache = new Map<string, SupervisionSubjectsResponse>();
const cohortCache = new Map<string, SupervisionCohortsResponse>();
const sessionCache = new Map<string, SupervisionSessionSummary[]>();

function baseKey(params: SupervisionHierarchyQuery | null): string | null {
  if (!params) return null;
  return [
    params.workspaceId,
    params.term,
    params.authorityMode,
    params.instructorId ?? 'all',
    params.sessionType ?? 'all',
  ].join(':');
}

export function useSupervisionSubjects(
  params: SupervisionHierarchyQuery | null,
  enabled: boolean,
) {
  const key = baseKey(params);
  const [data, setData] = useState<SupervisionSubjectsResponse | null>(
    key ? subjectCache.get(key) ?? null : null,
  );
  const [loading, setLoading] = useState(enabled && !data);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const retry = useCallback(() => setReloadVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !params || !key) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const cached = subjectCache.get(key);
    if (cached && reloadVersion === 0) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setData(null);
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void sessionAPI.getSupervisionSubjects(params, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        subjectCache.set(key, response);
        setData(response);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(resolveErrorMessage(requestError as ApiError, 'Unable to load supervised subjects.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, key, params, reloadVersion]);

  return { data, loading, error, retry };
}

export function useSupervisionCohorts(
  params: (SupervisionHierarchyQuery & {
    subjectSource: 'kernel' | 'cambridge';
    subjectId: number;
  }) | null,
  enabled: boolean,
) {
  const key = useMemo(() => {
    const base = baseKey(params);
    return base && params ? `${base}:${params.subjectSource}:${params.subjectId}` : null;
  }, [params]);
  const [data, setData] = useState<SupervisionCohortsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const retry = useCallback(() => setReloadVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !params || !key) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const cached = cohortCache.get(key);
    if (cached && reloadVersion === 0) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setData(null);
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void sessionAPI.getSupervisionCohorts(params, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        cohortCache.set(key, response);
        setData(response);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(resolveErrorMessage(requestError as ApiError, 'Unable to load supervised cohorts.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, key, params, reloadVersion]);

  return { data, loading, error, retry };
}

export function useSupervisionSessions(
  params: (SupervisionHierarchyQuery & {
    subjectSource: 'kernel' | 'cambridge';
    subjectId: number;
    cohortId: number;
  }) | null,
  enabled: boolean,
) {
  const key = useMemo(() => {
    const base = baseKey(params);
    return base && params
      ? `${base}:${params.subjectSource}:${params.subjectId}:${params.cohortId}`
      : null;
  }, [params]);
  const [data, setData] = useState<SupervisionSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const retry = useCallback(() => setReloadVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !params || !key) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    const cached = sessionCache.get(key);
    if (cached && reloadVersion === 0) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setData([]);
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void sessionAPI.getSupervisionSessions(params, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        sessionCache.set(key, response);
        setData(response);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(resolveErrorMessage(requestError as ApiError, 'Unable to load supervised sessions.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, key, params, reloadVersion]);

  return { data, loading, error, retry };
}

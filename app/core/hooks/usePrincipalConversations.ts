'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { assistantAPI } from '@/app/core/api/assistant';
import type { AssistantConversation } from '@/app/core/types/assistant';

const SEARCH_DEBOUNCE_MS = 300;

function replaceTitle(
  rows: AssistantConversation[],
  conversationId: number,
  title: string,
): AssistantConversation[] {
  return rows.map((row) => row.id === conversationId ? { ...row, title } : row);
}

function mergeUnique(
  current: AssistantConversation[],
  incoming: AssistantConversation[],
): AssistantConversation[] {
  const seen = new Set(current.map((row) => row.id));
  return [...current, ...incoming.filter((row) => !seen.has(row.id))];
}

function removeConversation(
  rows: AssistantConversation[],
  conversationId: number,
): AssistantConversation[] {
  return rows.filter((row) => row.id !== conversationId);
}

export interface PrincipalConversationState {
  recent: AssistantConversation[];
  recentCount: number;
  recentLoading: boolean;
  recentError: boolean;
  older: AssistantConversation[];
  olderLoading: boolean;
  olderError: boolean;
  olderHasNext: boolean;
  searchInput: string;
  setSearchInput: (value: string) => void;
  searchActive: boolean;
  searchResults: AssistantConversation[];
  searchLoading: boolean;
  searchError: boolean;
  searchHasNext: boolean;
  activeConversation: AssistantConversation | null;
  activeLoading: boolean;
  activeUnavailable: boolean;
  renamingId: number | null;
  renameErrorId: number | null;
  deletingId: number | null;
  deleteErrorId: number | null;
  loadOlder: () => Promise<void>;
  loadMoreSearch: () => Promise<void>;
  renameConversation: (conversationId: number, title: string) => Promise<boolean>;
  deleteConversation: (conversationId: number) => Promise<boolean>;
  retryRecent: () => void;
  applyConversationUpdate?: (conversation: AssistantConversation) => void;
}

export function usePrincipalConversations(
  organizationId: number | null,
  conversationId: number | null,
  invalidConversationId: boolean,
): PrincipalConversationState {
  const router = useRouter();
  const [recent, setRecent] = useState<AssistantConversation[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(false);
  const [older, setOlder] = useState<AssistantConversation[]>([]);
  const [olderPage, setOlderPage] = useState(2);
  const [olderLoading, setOlderLoading] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [olderHasNext, setOlderHasNext] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<AssistantConversation[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchHasNext, setSearchHasNext] = useState(false);
  const [activeConversation, setActiveConversation] = useState<AssistantConversation | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeUnavailable, setActiveUnavailable] = useState(invalidConversationId);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameErrorId, setRenameErrorId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<number | null>(null);
  const recentRequestRef = useRef(0);
  const searchRequestRef = useRef(0);
  const organizationRef = useRef(organizationId);
  organizationRef.current = organizationId;

  const loadRecent = useCallback(async () => {
    if (!organizationId) return;
    const requestId = ++recentRequestRef.current;
    setRecentLoading(true);
    setRecentError(false);
    try {
      const response = await assistantAPI.listConversations({ page_size: 10, page: 1 });
      if (requestId !== recentRequestRef.current) return;
      setRecent(response.results.slice(0, 10));
      setRecentCount(response.count);
      setOlderHasNext(Boolean(response.next));
      setOlder([]);
      setOlderPage(2);
    } catch {
      if (requestId === recentRequestRef.current) setRecentError(true);
    } finally {
      if (requestId === recentRequestRef.current) setRecentLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    recentRequestRef.current += 1;
    setRecent([]);
    setRecentCount(0);
    setOlder([]);
    setOlderPage(2);
    setSearchInput('');
    setDebouncedSearch('');
    setSearchResults([]);
    setActiveConversation(null);
    setRenamingId(null);
    setRenameErrorId(null);
    setDeletingId(null);
    setDeleteErrorId(null);
    if (organizationId) void loadRecent();
  }, [loadRecent, organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!organizationId || !debouncedSearch) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchLoading(false);
      setSearchError(false);
      setSearchHasNext(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(false);
    assistantAPI.listConversations(
      { q: debouncedSearch, page_size: 10, page: 1 },
      controller.signal,
    ).then((response) => {
      if (requestId !== searchRequestRef.current) return;
      setSearchResults(response.results);
      setSearchPage(2);
      setSearchHasNext(Boolean(response.next));
    }).catch(() => {
      if (requestId === searchRequestRef.current && !controller.signal.aborted) {
        setSearchError(true);
      }
    }).finally(() => {
      if (requestId === searchRequestRef.current) setSearchLoading(false);
    });
    return () => controller.abort();
  }, [debouncedSearch, organizationId]);

  useEffect(() => {
    if (!organizationId || conversationId === null || invalidConversationId) {
      setActiveConversation(null);
      setActiveLoading(false);
      setActiveUnavailable(invalidConversationId);
      return;
    }
    const controller = new AbortController();
    setActiveLoading(true);
    setActiveUnavailable(false);
    assistantAPI.getConversation(conversationId, controller.signal)
      .then(setActiveConversation)
      .catch(() => {
        if (!controller.signal.aborted) {
          setActiveConversation(null);
          setActiveUnavailable(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setActiveLoading(false);
      });
    return () => controller.abort();
  }, [conversationId, invalidConversationId, organizationId]);

  const loadOlder = useCallback(async () => {
    if (olderLoading || !olderHasNext) return;
    const requestOrganizationId = organizationId;
    setOlderLoading(true);
    setOlderError(false);
    try {
      const response = await assistantAPI.listConversations({ page_size: 10, page: olderPage });
      if (requestOrganizationId !== organizationRef.current) return;
      setOlder((current) => mergeUnique(current, response.results));
      setOlderPage((page) => page + 1);
      setOlderHasNext(Boolean(response.next));
    } catch {
      if (requestOrganizationId === organizationRef.current) setOlderError(true);
    } finally {
      if (requestOrganizationId === organizationRef.current) setOlderLoading(false);
    }
  }, [olderHasNext, olderLoading, olderPage, organizationId]);

  const loadMoreSearch = useCallback(async () => {
    if (searchLoading || !searchHasNext || !debouncedSearch) return;
    const requestId = searchRequestRef.current;
    const requestOrganizationId = organizationId;
    setSearchLoading(true);
    setSearchError(false);
    try {
      const response = await assistantAPI.listConversations({
        q: debouncedSearch,
        page_size: 10,
        page: searchPage,
      });
      if (
        requestId !== searchRequestRef.current
        || requestOrganizationId !== organizationRef.current
      ) return;
      setSearchResults((current) => mergeUnique(current, response.results));
      setSearchPage((page) => page + 1);
      setSearchHasNext(Boolean(response.next));
    } catch {
      if (
        requestId === searchRequestRef.current
        && requestOrganizationId === organizationRef.current
      ) setSearchError(true);
    } finally {
      if (
        requestId === searchRequestRef.current
        && requestOrganizationId === organizationRef.current
      ) setSearchLoading(false);
    }
  }, [debouncedSearch, organizationId, searchHasNext, searchLoading, searchPage]);

  const renameConversation = useCallback(async (id: number, rawTitle: string) => {
    if (renamingId !== null) return false;
    const requestOrganizationId = organizationId;
    const title = rawTitle.trim();
    const snapshot = { recent, older, searchResults, activeConversation };
    setRenamingId(id);
    setRenameErrorId(null);
    setRecent((rows) => replaceTitle(rows, id, title));
    setOlder((rows) => replaceTitle(rows, id, title));
    setSearchResults((rows) => replaceTitle(rows, id, title));
    setActiveConversation((row) => row?.id === id ? { ...row, title } : row);
    try {
      const updated = await assistantAPI.renameConversation(id, title);
      if (requestOrganizationId !== organizationRef.current) return false;
      setRecent((rows) => replaceTitle(rows, id, updated.title));
      setOlder((rows) => replaceTitle(rows, id, updated.title));
      setSearchResults((rows) => replaceTitle(rows, id, updated.title));
      setActiveConversation((row) => row?.id === id ? updated : row);
      return true;
    } catch {
      if (requestOrganizationId !== organizationRef.current) return false;
      setRecent(snapshot.recent);
      setOlder(snapshot.older);
      setSearchResults(snapshot.searchResults);
      setActiveConversation(snapshot.activeConversation);
      setRenameErrorId(id);
      return false;
    } finally {
      if (requestOrganizationId === organizationRef.current) setRenamingId(null);
    }
  }, [activeConversation, older, organizationId, recent, renamingId, searchResults]);

  const deleteConversation = useCallback(async (id: number) => {
    if (deletingId !== null) return false;
    const requestOrganizationId = organizationId;
    setDeletingId(id);
    setDeleteErrorId(null);
    try {
      await assistantAPI.deleteConversation(id);
      if (requestOrganizationId !== organizationRef.current) return false;
      setRecent((rows) => removeConversation(rows, id));
      setOlder((rows) => removeConversation(rows, id));
      setSearchResults((rows) => removeConversation(rows, id));
      setRecentCount((count) => Math.max(0, count - 1));
      if (activeConversation?.id === id || conversationId === id) {
        setActiveConversation(null);
        router.replace('/principal');
      }
      return true;
    } catch {
      if (requestOrganizationId === organizationRef.current) setDeleteErrorId(id);
      return false;
    } finally {
      if (requestOrganizationId === organizationRef.current) setDeletingId(null);
    }
  }, [activeConversation?.id, conversationId, deletingId, organizationId, router]);

  const applyConversationUpdate = useCallback((conversation: AssistantConversation) => {
    if (organizationId !== organizationRef.current) return;
    const replace = (rows: AssistantConversation[]) => rows.map(
      (row) => row.id === conversation.id ? conversation : row,
    );
    setRecent(replace);
    setOlder(replace);
    setSearchResults(replace);
    setActiveConversation((current) => current?.id === conversation.id ? conversation : current);
  }, [organizationId]);

  return {
    recent,
    recentCount,
    recentLoading,
    recentError,
    older,
    olderLoading,
    olderError,
    olderHasNext,
    searchInput,
    setSearchInput,
    searchActive: Boolean(searchInput.trim()),
    searchResults,
    searchLoading,
    searchError,
    searchHasNext,
    activeConversation,
    activeLoading,
    activeUnavailable,
    renamingId,
    renameErrorId,
    deletingId,
    deleteErrorId,
    loadOlder,
    loadMoreSearch,
    renameConversation,
    deleteConversation,
    retryRecent: () => void loadRecent(),
    applyConversationUpdate,
  };
}

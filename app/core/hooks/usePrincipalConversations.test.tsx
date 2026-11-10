import { createElement, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssistantConversation } from '@/app/core/types/assistant';
import {
  type PrincipalConversationState,
  usePrincipalConversations,
} from './usePrincipalConversations';

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/app/core/api/assistant', () => ({ assistantAPI: mocks }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function conversation(id: number, title: string): AssistantConversation {
  return {
    id,
    title,
    title_kind: 'AUTOMATIC',
    created_at: '2026-11-10T08:00:00Z',
    updated_at: '2026-11-10T08:00:00Z',
    last_activity_at: '2026-11-10T08:00:00Z',
    context_revision: 1,
    context: {
      academic_year: null,
      term: null,
      cohorts: null,
      subject: null,
      domain: null,
      intent: null,
    },
  };
}

let latestState: PrincipalConversationState;

function Harness(props: {
  organizationId: number | null;
  conversationId: number | null;
  invalidConversationId?: boolean;
}) {
  const state = usePrincipalConversations(
    props.organizationId,
    props.conversationId,
    Boolean(props.invalidConversationId),
  );
  useEffect(() => { latestState = state; }, [state]);
  return createElement('conversation-state', {
    title: state.activeConversation?.title,
    loading: state.activeLoading,
    unavailable: state.activeUnavailable,
  });
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('usePrincipalConversations active identity lifecycle', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
    mocks.listConversations.mockResolvedValue({
      count: 0, next: null, previous: null, results: [],
    });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
    vi.unstubAllGlobals();
  });

  it('loads and renames the active conversation without dropping a known title', async () => {
    mocks.getConversation.mockResolvedValue(conversation(10, 'Initial title'));
    mocks.renameConversation.mockResolvedValue(conversation(10, 'Renamed title'));
    await act(async () => {
      renderer = create(createElement(Harness, { organizationId: 1, conversationId: 10 }));
      await flushPromises();
    });
    expect(latestState.activeConversation?.title).toBe('Initial title');

    await act(async () => {
      const rename = latestState.renameConversation(10, 'Renamed title');
      expect(latestState.activeConversation?.title).toBe('Initial title');
      await rename;
      await flushPromises();
    });
    expect(latestState.activeConversation?.title).toBe('Renamed title');
  });

  it('never exposes the previous workspace title and ignores late detail responses', async () => {
    const workspaceOne = deferred<AssistantConversation>();
    const workspaceTwo = deferred<AssistantConversation>();
    mocks.getConversation
      .mockReturnValueOnce(workspaceOne.promise)
      .mockReturnValueOnce(workspaceTwo.promise);

    await act(async () => {
      renderer = create(createElement(Harness, { organizationId: 1, conversationId: 10 }));
      await flushPromises();
    });
    await act(async () => {
      renderer!.update(createElement(Harness, { organizationId: 2, conversationId: 10 }));
      await flushPromises();
    });
    expect(latestState.activeConversation).toBeNull();

    await act(async () => {
      workspaceTwo.resolve(conversation(10, 'Workspace two'));
      await flushPromises();
    });
    expect(latestState.activeConversation?.title).toBe('Workspace two');

    await act(async () => {
      workspaceOne.resolve(conversation(10, 'Late workspace one'));
      await flushPromises();
    });
    expect(latestState.activeConversation?.title).toBe('Workspace two');
  });

  it('retains the accepted first-message title across route handoff', async () => {
    const detail = deferred<AssistantConversation>();
    mocks.getConversation.mockReturnValue(detail.promise);
    await act(async () => {
      renderer = create(createElement(Harness, { organizationId: 1, conversationId: null }));
      await flushPromises();
    });

    await act(async () => {
      latestState.applyConversationUpdate?.(conversation(50, 'Accepted first question'));
      renderer!.update(createElement(Harness, { organizationId: 1, conversationId: 50 }));
      await flushPromises();
    });
    expect(latestState.activeConversation?.title).toBe('Accepted first question');
    expect(latestState.activeLoading).toBe(true);

    await act(async () => {
      detail.resolve(conversation(50, 'Accepted first question'));
      await flushPromises();
    });
    expect(latestState.activeConversation?.title).toBe('Accepted first question');
  });
});

import { createElement, StrictMode, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AssistantConversation,
  AssistantConversationMessageResponse,
  AssistantMessage,
  AssistantRun,
  AssistantTurn,
  AssistantTurnHistory,
} from '@/app/core/types/assistant';
import {
  type PrincipalConversationMessageState,
  usePrincipalConversationMessages,
} from './usePrincipalConversationMessages';

const mocks = vi.hoisted(() => ({
  listConversationTurns: vi.fn(),
  getRun: vi.fn(),
  createConversationMessage: vi.fn(),
  appendConversationMessage: vi.fn(),
  retryRun: vi.fn(),
  getConversation: vi.fn(),
}));

vi.mock('@/app/core/api/assistant', () => ({
  assistantAPI: mocks,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function conversation(id: number): AssistantConversation {
  return {
    id,
    title: `Conversation ${id}`,
    title_kind: 'AUTOMATIC',
    created_at: '2026-11-08T10:00:00Z',
    updated_at: '2026-11-08T10:00:00Z',
    last_activity_at: '2026-11-08T10:00:00Z',
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

function message(id: number, role: 'USER' | 'ASSISTANT', text: string): AssistantMessage {
  return {
    id,
    role,
    client_request_id: role === 'USER' ? `request-${id}` : null,
    created_at: '2026-11-08T10:00:00Z',
    content_blocks: [{ type: 'markdown', text }],
  };
}

function run(
  id: number,
  status: AssistantRun['status'],
  response: AssistantMessage | null = null,
  retryable = false,
): AssistantRun {
  return {
    id,
    status,
    execution_stage: status === 'FAILED' ? 'FAILED' : status === 'RUNNING' ? 'TOOL_RUNNING' : 'COMPLETED',
    attempt_number: 1,
    retryable,
    assistant_message: response,
  };
}

function turn(id: number, currentRun: AssistantRun | null): AssistantTurn {
  return {
    id,
    user_message: message(id * 10, 'USER', `Question ${id}`),
    current_run: currentRun,
    current_response: currentRun?.assistant_message ?? null,
    retry_allowed: currentRun?.status === 'FAILED' && currentRun.retryable,
    retry_target_run_id: currentRun?.status === 'FAILED' && currentRun.retryable
      ? currentRun.id
      : null,
    attempts: [],
  };
}

function history(...turns: AssistantTurn[]): AssistantTurnHistory {
  return {
    schema_version: 'assistant.turns.v1',
    turns,
    legacy_unlinked_messages: [],
  };
}

function acceptedResponse(
  conversationId: number,
  acceptedTurn: AssistantTurn,
): AssistantConversationMessageResponse {
  return {
    schema_version: 'assistant.turns.v1',
    conversation: conversation(conversationId),
    user_message: acceptedTurn.user_message,
    assistant_message: acceptedTurn.current_response,
    run_id: acceptedTurn.current_run!.id,
    status: acceptedTurn.current_run!.status,
    execution_stage: acceptedTurn.current_run!.execution_stage,
    turn: acceptedTurn,
  };
}

let latestState: PrincipalConversationMessageState;

function Harness(props: { organizationId: number | null; conversationId: number | null }) {
  const state = usePrincipalConversationMessages(props.organizationId, props.conversationId);
  useEffect(() => {
    latestState = state;
  }, [state]);
  return createElement('message-state', {
    turns: state.turns.length,
    loading: state.loading,
    refreshing: state.refreshing,
    unavailable: state.unavailable,
  });
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderHarness(
  props = { organizationId: 1 as number | null, conversationId: 10 as number | null },
  strict = false,
) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    const child = createElement(Harness, props);
    renderer = create(strict ? createElement(StrictMode, null, child) : child);
    await flushPromises();
  });
  return renderer;
}

describe('usePrincipalConversationMessages lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => `uuid-${Math.random()}`) });
    mocks.getConversation.mockImplementation(async (id: number) => conversation(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads a completed conversation once and ordinary rerenders do not refetch history', async () => {
    mocks.listConversationTurns.mockResolvedValue(history(
      turn(1, run(101, 'COMPLETED', message(201, 'ASSISTANT', 'Done'))),
    ));
    const renderer = await renderHarness();

    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(1);
    expect(latestState.loading).toBe(false);
    expect(latestState.turns).toHaveLength(1);

    await act(async () => {
      renderer.update(createElement(Harness, { organizationId: 1, conversationId: 10 }));
      latestState.completeProgressiveMessage(201);
      await flushPromises();
    });

    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('loads history once, polls every active run once, and terminal runs stop polling', async () => {
    mocks.listConversationTurns.mockResolvedValue(history(
      turn(1, run(101, 'RUNNING')),
      turn(2, run(102, 'PENDING')),
    ));
    mocks.getRun.mockImplementation(async (runId: number) => (
      run(runId, 'COMPLETED', message(runId + 1000, 'ASSISTANT', `Answer ${runId}`))
    ));
    const renderer = await renderHarness();

    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(1);
    expect(mocks.getRun).toHaveBeenCalledTimes(2);
    expect(new Set(mocks.getRun.mock.calls.map(([runId]) => runId))).toEqual(new Set([101, 102]));
    expect(latestState.turns.map((item) => item.current_response?.id)).toEqual([1101, 1102]);

    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await flushPromises();
    });
    expect(mocks.getRun).toHaveBeenCalledTimes(2);
    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('runs one bounded explicit refresh and preserves visible turns while it is pending', async () => {
    const refresh = deferred<AssistantTurnHistory>();
    const original = turn(1, run(101, 'COMPLETED', message(201, 'ASSISTANT', 'Original')));
    const updated = turn(1, run(101, 'COMPLETED', message(202, 'ASSISTANT', 'Updated')));
    mocks.listConversationTurns
      .mockResolvedValueOnce(history(original))
      .mockReturnValueOnce(refresh.promise);
    const renderer = await renderHarness();

    await act(async () => {
      latestState.retryLoad();
      await flushPromises();
    });
    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(2);
    expect(latestState.loading).toBe(false);
    expect(latestState.refreshing).toBe(true);
    expect(latestState.turns[0].current_response?.id).toBe(201);

    await act(async () => {
      refresh.resolve(history(updated));
      await refresh.promise;
      await flushPromises();
    });
    expect(latestState.refreshing).toBe(false);
    expect(latestState.turns[0].current_response?.id).toBe(202);
    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  it('does not let late refresh history replace a newer accepted turn', async () => {
    const refresh = deferred<AssistantTurnHistory>();
    const original = turn(1, run(101, 'COMPLETED', message(201, 'ASSISTANT', 'Original')));
    const acceptedTurn = turn(2, run(102, 'RUNNING'));
    mocks.listConversationTurns
      .mockResolvedValueOnce(history(original))
      .mockReturnValueOnce(refresh.promise);
    mocks.appendConversationMessage.mockResolvedValue(acceptedResponse(10, acceptedTurn));
    mocks.getRun.mockReturnValue(deferred<AssistantRun>().promise);
    const renderer = await renderHarness();

    await act(async () => {
      latestState.retryLoad();
      await flushPromises();
    });
    await act(async () => {
      await latestState.submitMessage('New question');
      await flushPromises();
    });
    expect(latestState.turns.map((item) => item.id)).toEqual([1, 2]);

    await act(async () => {
      refresh.resolve(history(original));
      await refresh.promise;
      await flushPromises();
    });
    expect(latestState.turns.map((item) => item.id)).toEqual([1, 2]);
    expect(latestState.refreshing).toBe(false);
    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  it('retries a failed initial load exactly once', async () => {
    mocks.listConversationTurns
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(history());
    const renderer = await renderHarness();
    expect(latestState.unavailable).toBe(true);

    await act(async () => {
      latestState.retryLoad();
      await flushPromises();
    });
    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(2);
    expect(latestState.unavailable).toBe(false);
    expect(latestState.loading).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('aborts obsolete history and ignores a late response after conversation and workspace switches', async () => {
    const first = deferred<AssistantTurnHistory>();
    const second = deferred<AssistantTurnHistory>();
    mocks.listConversationTurns
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockResolvedValueOnce(history(turn(3, run(303, 'COMPLETED', message(403, 'ASSISTANT', 'Workspace 2')))));
    const renderer = await renderHarness();
    const firstSignal = mocks.listConversationTurns.mock.calls[0][1] as AbortSignal;

    await act(async () => {
      renderer.update(createElement(Harness, { organizationId: 1, conversationId: 11 }));
      await flushPromises();
    });
    expect(firstSignal.aborted).toBe(true);
    const secondSignal = mocks.listConversationTurns.mock.calls[1][1] as AbortSignal;

    await act(async () => {
      renderer.update(createElement(Harness, { organizationId: 2, conversationId: 11 }));
      await flushPromises();
    });
    expect(secondSignal.aborted).toBe(true);
    expect(latestState.turns[0].id).toBe(3);

    await act(async () => {
      first.resolve(history(turn(1, run(301, 'COMPLETED', message(401, 'ASSISTANT', 'Stale 1')))));
      second.resolve(history(turn(2, run(302, 'COMPLETED', message(402, 'ASSISTANT', 'Stale 2')))));
      await flushPromises();
    });
    expect(latestState.turns.map((item) => item.id)).toEqual([3]);
    expect(latestState.loading).toBe(false);
    await act(async () => renderer.unmount());
  });

  it('cleans up polling requests and timers on unmount', async () => {
    mocks.listConversationTurns.mockResolvedValue(history(turn(1, run(101, 'RUNNING'))));
    const pendingPoll = deferred<AssistantRun>();
    mocks.getRun
      .mockResolvedValueOnce(run(101, 'RUNNING'))
      .mockReturnValueOnce(pendingPoll.promise);
    const renderer = await renderHarness();
    expect(mocks.getRun).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(750);
      await flushPromises();
    });
    expect(mocks.getRun).toHaveBeenCalledTimes(2);
    const pollSignal = mocks.getRun.mock.calls[1][1] as AbortSignal;

    await act(async () => renderer.unmount());
    expect(pollSignal.aborted).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await flushPromises();
    });
    expect(mocks.getRun).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains the accepted turn and active run across the first-message route handoff', async () => {
    const activeRun = run(501, 'RUNNING');
    const acceptedTurn = turn(5, activeRun);
    const pendingPoll = deferred<AssistantRun>();
    mocks.createConversationMessage.mockResolvedValue(acceptedResponse(50, acceptedTurn));
    mocks.getRun.mockReturnValue(pendingPoll.promise);
    const renderer = await renderHarness({ organizationId: 1, conversationId: null });

    let createdId: number | null = null;
    await act(async () => {
      createdId = await latestState.submitMessage('First question');
      await flushPromises();
    });
    expect(createdId).toBe(50);
    expect(mocks.createConversationMessage).toHaveBeenCalledTimes(1);
    expect(latestState.turns.map((item) => item.id)).toEqual([5]);

    await act(async () => {
      renderer.update(createElement(Harness, { organizationId: 1, conversationId: 50 }));
      await flushPromises();
    });
    expect(mocks.listConversationTurns).not.toHaveBeenCalled();
    expect(mocks.createConversationMessage).toHaveBeenCalledTimes(1);
    expect(mocks.getRun).toHaveBeenCalledTimes(1);
    expect(latestState.turns.map((item) => item.id)).toEqual([5]);
    await act(async () => renderer.unmount());
  });

  it('retries the targeted failed run and updates the same turn response area', async () => {
    const failed = run(601, 'FAILED', message(701, 'ASSISTANT', 'Failed'), true);
    mocks.listConversationTurns.mockResolvedValue(history(turn(6, failed)));
    mocks.retryRun.mockResolvedValue(run(602, 'RUNNING'));
    mocks.getRun.mockResolvedValue(run(602, 'COMPLETED', message(702, 'ASSISTANT', 'Recovered')));
    const renderer = await renderHarness();

    await act(async () => {
      await latestState.retryTurn(6, 601);
      await flushPromises();
    });
    expect(mocks.retryRun).toHaveBeenCalledWith(601, expect.any(String), expect.any(AbortSignal));
    expect(mocks.getRun).toHaveBeenCalledTimes(1);
    expect(latestState.turns).toHaveLength(1);
    expect(latestState.turns[0]).toMatchObject({
      id: 6,
      retry_allowed: false,
      retry_target_run_id: null,
      current_response: { id: 702 },
    });
    expect(mocks.listConversationTurns).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it('keeps one reveal active while both authoritative title refreshes complete', async () => {
    const completed = run(702, 'COMPLETED', message(
      802,
      'ASSISTANT',
      'This answer remains visible while its conversation title refreshes.',
    ));
    const acceptedTurn = turn(7, run(701, 'RUNNING'));
    mocks.listConversationTurns.mockResolvedValue(history());
    mocks.appendConversationMessage.mockResolvedValue(acceptedResponse(10, acceptedTurn));
    mocks.getRun.mockResolvedValue(completed);
    mocks.getConversation
      .mockResolvedValueOnce(conversation(10))
      .mockResolvedValueOnce({ ...conversation(10), title: 'First refreshed title' })
      .mockResolvedValueOnce({ ...conversation(10), title: 'Final refreshed title' });
    const onConversationUpdated = vi.fn();
    let renderer!: ReactTestRenderer;

    function RefreshHarness() {
      const state = usePrincipalConversationMessages(1, 10, onConversationUpdated);
      useEffect(() => { latestState = state; }, [state]);
      return createElement('message-state', { progressive: [...state.progressiveMessageIds] });
    }

    await act(async () => {
      renderer = create(createElement(RefreshHarness));
      await flushPromises();
    });
    await act(async () => {
      await latestState.submitMessage('Question with an asynchronously generated title');
      await flushPromises();
    });
    expect([...latestState.progressiveMessageIds]).toEqual([802]);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await flushPromises();
    });
    expect([...latestState.progressiveMessageIds]).toEqual([802]);
    expect(onConversationUpdated).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(900);
      await flushPromises();
    });
    expect([...latestState.progressiveMessageIds]).toEqual([802]);
    expect(onConversationUpdated).toHaveBeenCalledTimes(3);

    await act(async () => {
      latestState.completeProgressiveMessage(802);
      await flushPromises();
    });
    expect([...latestState.progressiveMessageIds]).toEqual([]);

    await act(async () => renderer.unmount());
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stays bounded in React Strict Mode and starts only one live poll', async () => {
    mocks.listConversationTurns.mockResolvedValue(history(turn(1, run(101, 'RUNNING'))));
    const pendingPoll = deferred<AssistantRun>();
    mocks.getRun.mockReturnValue(pendingPoll.promise);
    const renderer = await renderHarness(undefined, true);

    expect(mocks.listConversationTurns.mock.calls.length).toBeLessThanOrEqual(2);
    expect(mocks.getRun).toHaveBeenCalledTimes(1);
    await act(async () => {
      renderer.update(createElement(StrictMode, null, createElement(Harness, {
        organizationId: 1,
        conversationId: 10,
      })));
      await flushPromises();
    });
    expect(mocks.listConversationTurns.mock.calls.length).toBeLessThanOrEqual(2);
    expect(mocks.getRun).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});

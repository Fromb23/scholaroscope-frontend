import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactNode } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  conversationState: {} as Record<string, unknown>,
  messageState: {} as Record<string, unknown>,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('a', props, children),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({}),
  useRouter: () => mocks.router,
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    activeOrg: { id: 3, name: 'Demo School' },
    activeOperatingContext: 'INSTITUTION_OVERSIGHT',
  }),
}));

vi.mock('@/app/core/hooks/useAcademic', () => ({
  useCurrentAcademicYear: () => ({
    currentYear: { name: '2026' },
    error: null,
    loading: false,
    refetch: vi.fn(),
  }),
  useCurrentTerm: () => ({
    currentTerm: { name: 'Term 1' },
    error: null,
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/app/core/hooks/usePrincipalConversations', () => ({
  usePrincipalConversations: () => mocks.conversationState,
}));

vi.mock('@/app/core/hooks/usePrincipalConversationMessages', () => ({
  usePrincipalConversationMessages: () => mocks.messageState,
}));

vi.mock('@/app/core/components/principal/AssistantResponseBlocks', () => ({
  AssistantResponseBlocks: () => createElement('div', null, 'Assistant response'),
}));

import { PrincipalWorkspace } from './PrincipalWorkspace';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const workspace = read('app/core/components/principal/PrincipalWorkspace.tsx');
const hook = read('app/core/hooks/usePrincipalConversations.ts');
const api = read('app/core/api/assistant.ts');
const messageHook = read('app/core/hooks/usePrincipalConversationMessages.ts');
const thinking = read('app/core/components/assistant/AssistantThinkingIndicator.tsx');
const assistantTypes = read('app/core/types/assistant.ts');
const header = read('app/components/layout/Header.tsx');
const shell = read('app/(dashboard)/DashboardClientShell.tsx');

describe('Principal conversational workspace', () => {
  it('uses semantic metadata for Principal Dashboard | Scholaroscope', () => {
    expect(read('app/(dashboard)/principal/layout.tsx')).toContain("title: 'Principal Dashboard'");
    expect(read('app/layout.tsx')).toContain("template: '%s | Scholaroscope'");
  });

  it('derives the Principal profile subtitle from the oversight context', () => {
    expect(header).toMatch(/activeOperatingContext === 'INSTITUTION_OVERSIGHT'[\s\S]*\? 'Principal'/);
    expect(header).toContain('{user?.full_name}');
  });

  it('uses the approved new-conversation heading and support copy', () => {
    expect(workspace).toContain('What would you like to know about?');
    expect(workspace).toContain('Ask about attendance, learning progress, projects, assessments, or anything requiring your attention.');
  });

  it('requests and renders at most ten recent conversations', () => {
    expect(hook).toContain("{ page_size: 10, page: 1 }");
    expect(hook).toContain('response.results.slice(0, 10)');
  });

  it('shows More conversations only above ten authorized rows', () => {
    expect(workspace).toContain('state.recentCount > 10');
    expect(workspace).toContain('More conversations');
  });

  it('bounds and scrolls the older conversation disclosure', () => {
    expect(workspace).toContain('max-h-64');
    expect(workspace).toContain('overflow-y-auto');
    expect(workspace).toContain('aria-expanded={moreOpen}');
  });

  it('progressively paginates older conversations', () => {
    expect(hook).toContain('page: olderPage');
    expect(hook).toContain('setOlderPage((page) => page + 1)');
    expect(workspace).toContain('Load more');
  });

  it('searches all authorized metadata through the server API', () => {
    expect(api).toContain("'/assistant/conversations/'");
    expect(hook).toContain('q: debouncedSearch');
    expect(workspace).toContain('placeholder="Search conversations"');
  });

  it('clearing search restores the recent list', () => {
    expect(workspace).toContain('state.searchActive ? state.searchResults : state.recent');
    expect(hook).toContain("searchActive: Boolean(searchInput.trim())");
  });

  it('navigates history rows to deterministic routes', () => {
    expect(workspace).toContain('href={`/principal/conversations/${conversation.id}`}');
    expect(read('app/(dashboard)/principal/conversations/[conversationId]/page.tsx')).toContain('<PrincipalWorkspace />');
  });

  it('marks only the selected conversation current', () => {
    expect(workspace).toContain("aria-current={active ? 'page' : undefined}");
    expect(workspace).toContain('conversation.id === activeConversationId');
  });

  it('new conversation returns to the blank URL state', () => {
    expect(workspace).toContain('href="/principal"');
    expect(workspace).toContain("aria-current={newConversationActive ? 'page' : undefined}");
  });

  it('saves inline rename on Enter with an explicit save control', () => {
    expect(workspace).toContain("event.key === 'Enter'");
    expect(workspace).toContain('aria-label="Save conversation title"');
    expect(api).toContain('renameConversation');
  });

  it('cancels inline rename on Escape', () => {
    expect(workspace).toContain("event.key === 'Escape'");
    expect(workspace).toContain('cancel();');
  });

  it('rejects blank and overlong titles before submission', () => {
    expect(workspace).toContain('if (!nextTitle)');
    expect(workspace).toContain('if (nextTitle.length > MAX_TITLE_LENGTH)');
    expect(workspace).toContain('const MAX_TITLE_LENGTH = 120');
  });

  it('rolls an optimistic rename back after failure', () => {
    expect(hook).toContain('setRecent(snapshot.recent)');
    expect(hook).toContain('setActiveConversation(snapshot.activeConversation)');
    expect(workspace).toContain('Your previous title was restored.');
  });

  it('renders an honest empty production history without fixtures', () => {
    expect(workspace).toContain('Your conversations will appear here.');
    expect(workspace).not.toContain('What requires my attention today?');
  });

  it('keeps the conversation shell when academic context fails', () => {
    expect(workspace).toContain('contextUnavailable={Boolean(academicYear.error || term.error)}');
    expect(workspace).toContain('Retry context');
    expect(workspace).toContain('Retry context');
  });

  it('provides a mobile conversation drawer and removes the wide global shell', () => {
    expect(workspace).toContain('Open conversation history');
    expect(workspace).toContain("fixed inset-0 z-50 lg:hidden");
    expect(shell).toContain("isPrincipalConversationWorkspace ? null : <Sidebar");
  });

  it('prevents stale search responses from replacing newer results', () => {
    expect(hook).toContain('const requestId = ++searchRequestRef.current');
    expect(hook).toContain('if (requestId !== searchRequestRef.current) return;');
    expect(hook).toContain('controller.abort()');
  });

  it('keeps a blank route unpersisted until the first submission', () => {
    expect(messageHook).toContain('conversationId === null');
    expect(messageHook).toContain('assistantAPI.createConversationMessage({ message: text, client_request_id: clientRequestId })');
    expect(workspace).toContain('isBlank={rawConversationId === undefined}');
  });

  it('uses first-message and continued-message endpoints with an oversight header only', () => {
    expect(api).toContain("'/assistant/conversations/messages/'");
    expect(api).toContain('`/assistant/conversations/${conversationId}/messages/`');
    expect(api).toContain("'X-Scholaroscope-Operating-Context': 'INSTITUTION_OVERSIGHT'");
    expect(messageHook).toContain('client_request_id: clientRequestId');
    expect(messageHook).not.toContain('operating_context');
  });

  it('sends the oversight header on every conversation API operation and never in a body', () => {
    expect(api).toContain('assistantRequestConfig(signal)');
    expect(api.match(/headers: OVERSIGHT_CONTEXT_HEADERS/g)?.length).toBeGreaterThanOrEqual(5);
    expect(api).not.toContain('operating_context');
    expect(api).not.toContain('operatingContext');
  });

  it('types unresolved governed conversation context safely', () => {
    expect(assistantTypes).toContain('context_revision: number');
    expect(assistantTypes).toContain('academic_year: AssistantAcademicContextEntity | null');
    expect(assistantTypes).toContain('term: AssistantTermContext | null');
    expect(assistantTypes).toContain('cohorts: AssistantAcademicContextEntity[] | null');
    expect(assistantTypes).toContain('subject: AssistantAcademicContextEntity | null');
    expect(assistantTypes).toContain("| 'CLOSED_HISTORICAL'");
  });

  it('updates active conversation context from each message response', () => {
    expect(messageHook).toContain('onConversationUpdated?.(response.conversation)');
    expect(hook).toContain('setActiveConversation((current) => current?.id === conversation.id ? conversation : current)');
    expect(workspace).toContain('state.applyConversationUpdate');
  });

  it('replaces blank history with the persisted conversation URL', () => {
    expect(workspace).toContain('router.replace(`/principal/conversations/${createdConversationId}`)');
    expect(workspace).not.toContain('router.push(`/principal/conversations/');
  });

  it('loads persisted messages and renders user and assistant roles in server order', () => {
    expect(messageHook).toContain('assistantAPI.listConversationMessages(conversationId');
    expect(messageHook).toContain('.then(setMessages)');
    expect(workspace).toContain("message.role === 'ASSISTANT'");
    expect(workspace).toContain('blocks={message.content_blocks}');
  });

  it('prevents double submission and retries the failed run without another user bubble', () => {
    expect(messageHook).toContain('if (!text || !organizationId || sending) return null;');
    expect(messageHook).toContain('const clientRequestId = crypto.randomUUID()');
    expect(messageHook).toContain('assistantAPI.retryRun(runId, crypto.randomUUID())');
    expect(messageHook).toContain('activeRunRef.current');
    expect(messageHook.match(/role: 'USER'/g)).toHaveLength(1);
  });

  it('uses shared thinking and progressive response primitives', () => {
    expect(workspace).toContain('<AssistantThinkingIndicator stage={messageState.executionStage} longRunning={messageState.longRunning} />');
    expect(workspace).toContain("['SUBMITTING', 'THINKING'].includes(messageState.requestState)");
    expect(workspace).not.toContain('Sending your question and waiting for governed intelligence');
    expect(workspace).toContain('progressive={messageState.progressiveMessageIds.has(message.id)}');
    expect(workspace).toContain('message.role === \'ASSISTANT\'');
  });

  it('bounds assistant requests and distinguishes timeout from cancellation', () => {
    expect(api).toContain('ASSISTANT_REQUEST_TIMEOUT_MS = 45_000');
    expect(api).toContain("error.code === 'ECONNABORTED'");
    expect(messageHook).toContain('!controller.signal.aborted');
    expect(messageHook).toContain('activeControllerRef.current?.abort()');
  });

  it('follows responses only while the reader remains near the bottom', () => {
    expect(workspace).toContain('if (!nearBottomRef.current');
    expect(workspace).toContain('container.scrollHeight - container.scrollTop - container.clientHeight < 120');
  });

  it('polls asynchronous runs and cancels polling at workspace boundaries', () => {
    expect(messageHook).toContain('assistantAPI.getRun(runId, controller.signal)');
    expect(messageHook).toContain("['COMPLETED', 'SUCCEEDED', 'FAILED', 'UNSUPPORTED'].includes(run.status)");
    expect(messageHook).toContain('activeControllerRef.current?.abort()');
    expect(messageHook).toContain('failures >= 5');
  });

  it('maps real stages and reserves Almost done for composition', () => {
    expect(thinking).toContain("COMPOSING_RESPONSE: 'Almost done — preparing your response'");
    expect(thinking).toContain("TOOL_RUNNING: 'Analysing attendance'");
    expect(thinking.match(/Almost done/g)).toHaveLength(1);
    expect(messageHook).toContain('Date.now() - started >= 25_000');
  });

  it('shows a jump-to-latest control without forcing a scrolled-up reader', () => {
    expect(workspace).toContain('if (!nearBottomRef.current) { setShowJumpToLatest(true); return; }');
    expect(workspace).toContain('aria-label="Jump to latest response"');
    expect(workspace).toContain('setShowJumpToLatest(false)');
    expect(workspace).toContain('scrollFrameRef.current !== null');
  });

  it('uses content-sized bubbles and one in-message error surface', () => {
    expect(workspace).toContain("'ml-auto w-fit max-w-[85%]");
    expect(workspace).toContain("'mr-auto w-fit max-w-full");
    expect(workspace).not.toContain('role="alert" className="mt-2 flex items-center');
  });

  it('uses school-wide composer wording', () => {
    expect(workspace).toContain("'Ask about your school'");
    expect(workspace).not.toContain('Ask about governed attendance information');
  });

  it('does not submit or switch context outside explicit oversight', () => {
    expect(workspace).toContain("canSend={activeOperatingContext === 'INSTITUTION_OVERSIGHT'}");
    expect(workspace).toContain('Your active context has not been changed.');
    expect(workspace).not.toContain('setActiveOperatingContext');
    expect(workspace).not.toContain('assistantAPI.chat');
  });

  it('requires delete confirmation, removes history only after success, and returns active deletion to blank', () => {
    expect(workspace).toContain('window.confirm(`Delete');
    expect(hook).toContain('await assistantAPI.deleteConversation(id)');
    expect(hook).toContain('setRecent((rows) => removeConversation(rows, id))');
    expect(hook).toContain("router.replace('/principal')");
    expect(hook.indexOf('await assistantAPI.deleteConversation(id)')).toBeLessThan(hook.indexOf('setRecent((rows) => removeConversation(rows, id))'));
    expect(workspace).toContain('It remains in your history; retry when ready.');
  });

  it('sets the browser title from the active server conversation title', () => {
    expect(workspace).toContain('document.title = state.activeConversation?.title');
    expect(workspace).toContain('Principal Dashboard | Scholaroscope');
  });
});

function renderWorkspace(): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(createElement(PrincipalWorkspace));
  });
  return renderer as ReactTestRenderer;
}

function hasClass(node: ReactTestInstance, className: string): boolean {
  return String(node.props.className ?? '').split(/\s+/).includes(className);
}

describe('Principal workspace layout and controls', () => {
  beforeEach(() => {
    mocks.router.replace.mockClear();
    mocks.conversationState = {
      searchActive: false,
      searchResults: [],
      recent: [],
      recentCount: 0,
      recentLoading: false,
      recentError: null,
      retryRecent: vi.fn(),
      searchInput: '',
      setSearchInput: vi.fn(),
      searchLoading: false,
      searchError: null,
      searchHasNext: false,
      loadMoreSearch: vi.fn(),
      older: [],
      olderLoading: false,
      olderError: null,
      olderHasNext: false,
      loadOlder: vi.fn(),
      renamingId: null,
      renameErrorId: null,
      renameConversation: vi.fn(),
      activeConversation: null,
      activeLoading: false,
      activeUnavailable: false,
      deletingId: null,
      deleteErrorId: null,
      deleteConversation: vi.fn(),
    };
    mocks.messageState = {
      messages: [],
      loading: false,
      unavailable: false,
      sending: false,
      requestState: 'IDLE',
      executionStage: null,
      longRunning: false,
      diagnostics: undefined,
      progressiveMessageIds: new Set(),
      retryableError: null,
      submitMessage: vi.fn(),
      retrySubmission: vi.fn(),
      retryLoad: vi.fn(),
      completeProgressiveMessage: vi.fn(),
    };
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('document', { title: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fills inherited height and keeps only the message region scrollable', () => {
    const renderer = renderWorkspace();
    const workspaceRoot = renderer.root.findAll(
      (node) => node.type === 'div' && hasClass(node, 'h-full') && hasClass(node, 'w-full'),
    )[0];
    const canvas = renderer.root.findByType('section');
    const directRegions = canvas.children.filter(
      (child): child is ReactTestInstance => typeof child !== 'string',
    );
    const messageRegion = directRegions[2];
    const composer = directRegions[3];

    expect(workspaceRoot).toBeDefined();
    expect(hasClass(workspaceRoot, 'min-h-0')).toBe(true);
    expect(hasClass(workspaceRoot, 'overflow-hidden')).toBe(true);
    expect(hasClass(canvas, 'min-w-0')).toBe(true);
    expect(hasClass(messageRegion, 'min-h-0')).toBe(true);
    expect(hasClass(messageRegion, 'flex-1')).toBe(true);
    expect(hasClass(messageRegion, 'relative')).toBe(true);
    expect(messageRegion.findAll((node) => hasClass(node, 'overflow-y-auto'))).not.toHaveLength(0);
    expect(hasClass(composer, 'shrink-0')).toBe(true);
    expect(messageRegion.findAll((node) => node === composer)).toHaveLength(0);
  });

  it('uses the correct icons for send, new conversation, and mobile drawer close', () => {
    const renderer = renderWorkspace();
    const sendButton = renderer.root.findByProps({ 'aria-label': 'Send message' });
    const newConversation = renderer.root.findByProps({ href: '/principal' });

    expect(
      sendButton.findAll((node) => node.type === 'svg' && hasClass(node, 'lucide-send')),
    ).toHaveLength(1);
    expect(sendButton.findAll((node) => hasClass(node, 'lucide-plus'))).toHaveLength(0);
    expect(sendButton.findAll((node) => hasClass(node, 'rotate-45'))).toHaveLength(0);
    expect(
      newConversation.findAll((node) => node.type === 'svg' && hasClass(node, 'lucide-plus')),
    ).toHaveLength(1);

    act(() => {
      renderer.root.findByProps({ 'aria-label': 'Open conversation history' }).props.onClick();
    });
    const closeButton = renderer.root.findByProps({
      'aria-label': 'Close conversation history panel',
    });
    expect(
      closeButton.findAll((node) => node.type === 'svg' && hasClass(node, 'lucide-x')),
    ).toHaveLength(1);
  });
});

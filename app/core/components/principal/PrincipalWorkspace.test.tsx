import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const workspace = read('app/core/components/principal/PrincipalWorkspace.tsx');
const hook = read('app/core/hooks/usePrincipalConversations.ts');
const api = read('app/core/api/assistant.ts');
const messageHook = read('app/core/hooks/usePrincipalConversationMessages.ts');
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
    expect(messageHook).toContain('assistantAPI.createConversationMessage(payload)');
    expect(workspace).toContain('isBlank={rawConversationId === undefined}');
  });

  it('uses first-message and continued-message endpoints with an oversight header only', () => {
    expect(api).toContain("'/assistant/conversations/messages/'");
    expect(api).toContain('`/assistant/conversations/${conversationId}/messages/`');
    expect(api).toContain("'X-Scholaroscope-Operating-Context': 'INSTITUTION_OVERSIGHT'");
    expect(messageHook).toContain('client_request_id: pending.clientRequestId');
    expect(messageHook).not.toContain('operating_context');
  });

  it('replaces blank history with the persisted conversation URL', () => {
    expect(workspace).toContain('router.replace(`/principal/conversations/${createdConversationId}`)');
    expect(workspace).not.toContain('router.push(`/principal/conversations/');
  });

  it('loads persisted messages and renders user and assistant roles in server order', () => {
    expect(messageHook).toContain('assistantAPI.listConversationMessages(conversationId');
    expect(messageHook).toContain('setMessages(response)');
    expect(workspace).toContain("message.role === 'ASSISTANT'");
    expect(workspace).toContain('<AssistantResponseBlocks blocks={message.content_blocks} />');
  });

  it('prevents double submission and reuses the request ID for retry', () => {
    expect(messageHook).toContain('if (sendingRef.current) return null;');
    expect(messageHook).toContain('clientRequestId: crypto.randomUUID()');
    expect(messageHook).toContain('const pending = pendingRef.current;');
    expect(messageHook).toContain('return performSubmission(pending);');
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

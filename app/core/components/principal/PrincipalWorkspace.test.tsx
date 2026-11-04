import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const workspace = read('app/core/components/principal/PrincipalWorkspace.tsx');
const hook = read('app/core/hooks/usePrincipalConversations.ts');
const api = read('app/core/api/assistant.ts');
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
    expect(workspace).toContain('Intelligence not connected');
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

  it('does not enable AI submission or persist navigation-created threads', () => {
    expect(workspace).toContain('disabled placeholder="Intelligence not connected"');
    expect(api).not.toContain('createConversation');
    expect(workspace).not.toContain('assistantAPI.chat');
  });
});

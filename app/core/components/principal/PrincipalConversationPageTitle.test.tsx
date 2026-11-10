import { createElement, StrictMode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageTitleProvider } from '@/app/core/pageIdentity/PageTitleProvider';
import { PrincipalConversationPageTitle } from './PrincipalConversationPageTitle';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const navigationState = vi.hoisted(() => ({
  pathname: '/principal/conversations/10',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

function tree(props: Parameters<typeof PrincipalConversationPageTitle>[0]) {
  return createElement(
    StrictMode,
    null,
    createElement(
      PageTitleProvider,
      null,
      createElement(PrincipalConversationPageTitle, props),
    ),
  );
}

describe('Principal conversation semantic title lifecycle', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    navigationState.pathname = '/principal/conversations/10';
    vi.stubGlobal('document', { title: '' });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
    vi.unstubAllGlobals();
  });

  it('covers loading, established, renamed, refreshed, and unavailable identities', async () => {
    await act(async () => {
      renderer = create(tree({ isBlank: false, loading: true, unavailable: false }));
    });
    expect(document.title).toBe('Opening conversation | Scholaroscope');

    await act(async () => {
      renderer!.update(tree({
        isBlank: false, title: 'Attendance review', loading: false, unavailable: false,
      }));
    });
    expect(document.title).toBe('Attendance review | Scholaroscope');

    await act(async () => {
      renderer!.update(tree({
        isBlank: false, title: 'Renamed attendance review', loading: true, unavailable: false,
      }));
    });
    expect(document.title).toBe('Renamed attendance review | Scholaroscope');

    await act(async () => {
      renderer!.update(tree({ isBlank: false, loading: false, unavailable: true }));
    });
    expect(document.title).toBe('Conversation unavailable | Scholaroscope');
  });

  it('drops the old identity on navigation and gives blank conversations a deliberate label', async () => {
    await act(async () => {
      renderer = create(tree({
        isBlank: false, title: 'Workspace one title', loading: false, unavailable: false,
      }));
    });
    expect(document.title).toBe('Workspace one title | Scholaroscope');

    navigationState.pathname = '/principal';
    await act(async () => {
      renderer!.update(tree({ isBlank: true, loading: false, unavailable: false }));
    });
    expect(document.title).toBe('New conversation | Scholaroscope');

    navigationState.pathname = '/principal/conversations/22';
    await act(async () => {
      renderer!.update(tree({ isBlank: false, loading: true, unavailable: false }));
    });
    expect(document.title).toBe('Opening conversation | Scholaroscope');
  });
});

import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageTitleProvider, useSemanticPageTitle } from './PageTitleProvider';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const navigationState = vi.hoisted(() => ({
  pathname: '/projects/definitions/7',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

function TitledPage({ title }: { title: string }) {
  useSemanticPageTitle(title);
  return createElement('div');
}

describe('PageTitleProvider override lifecycle', () => {
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    navigationState.pathname = '/projects/definitions/7';
    vi.stubGlobal('document', { title: '' });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
    vi.unstubAllGlobals();
  });

  it('preserves the mounted override and drops stale entity titles on navigation', async () => {
    await act(async () => {
      renderer = create(
        createElement(
          PageTitleProvider,
          null,
          createElement(TitledPage, { title: 'Community Garden' }),
        ),
      );
    });

    expect(document.title).toBe('Community Garden | Scholaroscope');

    navigationState.pathname = '/projects';
    await act(async () => {
      renderer!.update(createElement(PageTitleProvider, null, createElement('div')));
    });

    expect(document.title).toBe('Projects | Scholaroscope');

    navigationState.pathname = '/projects/definitions/8';
    await act(async () => {
      renderer!.update(
        createElement(
          PageTitleProvider,
          null,
          createElement(TitledPage, { title: 'Water Conservation' }),
        ),
      );
    });

    expect(document.title).toBe('Water Conservation | Scholaroscope');
  });

  it('replaces project workspace identity across direct loads, deployments, and navigation away', async () => {
    navigationState.pathname = '/projects/11';
    await act(async () => {
      renderer = create(
        createElement(PageTitleProvider, null, createElement(TitledPage, { title: 'Project' })),
      );
    });
    expect(document.title).toBe('Project | Scholaroscope');

    await act(async () => {
      renderer!.update(
        createElement(
          PageTitleProvider,
          null,
          createElement(TitledPage, { title: 'Community Garden — Grade 7 Yellow' }),
        ),
      );
    });
    expect(document.title).toBe('Community Garden — Grade 7 Yellow | Scholaroscope');

    navigationState.pathname = '/projects/12';
    await act(async () => {
      renderer!.update(
        createElement(PageTitleProvider, null, createElement(TitledPage, { title: 'Project' })),
      );
    });
    expect(document.title).toBe('Project | Scholaroscope');

    await act(async () => {
      renderer!.update(
        createElement(
          PageTitleProvider,
          null,
          createElement(TitledPage, { title: 'Water Conservation — Grade 8 East' }),
        ),
      );
    });
    expect(document.title).toBe('Water Conservation — Grade 8 East | Scholaroscope');

    navigationState.pathname = '/projects';
    await act(async () => {
      renderer!.update(createElement(PageTitleProvider, null, createElement('div')));
    });
    expect(document.title).toBe('Projects | Scholaroscope');
  });
});

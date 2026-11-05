import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

import { RouteTransition } from './RouteTransition';

function renderTransition(fillAvailableHeight?: boolean): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    const child = createElement('div', null, 'Route content');
    renderer = create(
      createElement(
        RouteTransition,
        fillAvailableHeight === undefined
          ? { children: child }
          : { children: child, fillAvailableHeight },
      ),
    );
  });
  return renderer as ReactTestRenderer;
}

describe('RouteTransition layout contract', () => {
  beforeEach(() => {
    mocks.pathname = '/dashboard';
  });

  it('keeps the existing wrapper classes by default', () => {
    const wrapper = renderTransition().root.findByType('div');

    expect(wrapper.props.className).toBe(
      'mobile-route-transition mobile-route-transition-initial',
    );
  });

  it('fills inherited height only when enabled', () => {
    const wrapper = renderTransition(true).root.findByType('div');

    expect(wrapper.props.className).toBe(
      'mobile-route-transition h-full min-h-0 mobile-route-transition-initial',
    );
  });
});

import { createElement, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { ControlledReportAccordion } from './ControlledReportAccordion';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ renderBody }: { renderBody: (value: string) => React.ReactNode }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return createElement(ControlledReportAccordion<string>, {
    ariaLabel: 'Reports',
    expandedKey: expanded,
    onExpandedKeyChange: setExpanded,
    renderBody,
    items: [
      { key: 'a', value: 'Alpha body', heading: 'Alpha', summary: 'One' },
      { key: 'b', value: 'Beta body', heading: 'Beta', summary: 'Two' },
    ],
  });
}

describe('ControlledReportAccordion', () => {
  it('mounts no body initially and exactly one body after each selection', () => {
    const renderBody = vi.fn((value: string) => createElement('p', null, value));
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(createElement(Harness, { renderBody }));
    });

    const buttons = renderer!.root.findAllByType('button');
    expect(renderBody).not.toHaveBeenCalled();
    expect(buttons.map((button) => button.props['aria-expanded'])).toEqual([false, false]);

    act(() => buttons[0].props.onClick());
    expect(renderer!.root.findAllByType('p').map((node) => node.children.join(''))).toEqual(['Alpha body']);
    expect(renderer!.root.findAllByType('button').map((button) => button.props['aria-expanded'])).toEqual([true, false]);

    act(() => renderer!.root.findAllByType('button')[1].props.onClick());
    expect(renderer!.root.findAllByType('p').map((node) => node.children.join(''))).toEqual(['Beta body']);
    expect(renderer!.root.findAllByType('button').map((button) => button.props['aria-expanded'])).toEqual([false, true]);
  });
});

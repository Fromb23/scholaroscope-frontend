import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assistantRevealDuration,
  AssistantProgressiveText,
  isStructuredAssistantMarkdown,
  splitAssistantGraphemes,
} from './AssistantProgressiveText';
import { AssistantThinkingIndicator } from './AssistantThinkingIndicator';
import { assistantRequestStateReducer } from './useAssistantRequestState';

describe('shared assistant interaction primitives', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('announces the compact branded thinking state', () => {
    const html = renderToStaticMarkup(createElement(AssistantThinkingIndicator));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Scholaroscope is thinking"');
    expect(html).not.toContain('governed intelligence response');
  });

  it('models the complete request sequence and typed failures', () => {
    let state = assistantRequestStateReducer('IDLE', 'SUBMIT');
    expect(state).toBe('SUBMITTING');
    state = assistantRequestStateReducer(state, 'WAIT_FOR_RESPONSE');
    expect(state).toBe('THINKING');
    state = assistantRequestStateReducer(state, 'REVEAL_RESPONSE');
    expect(state).toBe('TYPEWRITING');
    expect(assistantRequestStateReducer(state, 'FINISH')).toBe('COMPLETE');
    expect(assistantRequestStateReducer('THINKING', 'PROVIDER_TIMED_OUT')).toBe('PROVIDER_TIMEOUT');
    expect(assistantRequestStateReducer('THINKING', 'RESPONSE_WAS_REJECTED')).toBe('RESPONSE_REJECTED');
    expect(assistantRequestStateReducer('THINKING', 'REQUEST_DID_FAIL')).toBe('REQUEST_FAILED');
  });

  it('keeps grapheme clusters intact and caps long response duration', () => {
    expect(splitAssistantGraphemes('Café 👩‍🏫')).toEqual(['C', 'a', 'f', 'é', ' ', '👩‍🏫']);
    expect(assistantRevealDuration(10_000)).toBe(2500);
    expect(assistantRevealDuration(5)).toBeGreaterThan(0);
  });

  it('recognizes code fences and Markdown tables as immediate structured content', () => {
    expect(isStructuredAssistantMarkdown('```ts\nconst safe = true;\n```')).toBe(true);
    expect(isStructuredAssistantMarkdown('| Name | Total |\n| --- | ---: |\n| A | 2 |')).toBe(true);
    const html = renderToStaticMarkup(createElement(AssistantProgressiveText, {
      text: '```ts\nconst safe = true;\n```',
      active: true,
    }));
    expect(html).toContain('const safe = true;');
    expect(html).not.toContain('Show full response');
  });

  it('renders historical text immediately', () => {
    const html = renderToStaticMarkup(createElement(AssistantProgressiveText, {
      text: 'Restored conversation history',
      active: false,
    }));
    expect(html).toContain('Restored conversation history');
  });

  it('progressively reveals a newly received conversational response', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(createElement(AssistantProgressiveText, {
        text: 'A newly received response appears progressively.',
        active: true,
      }));
    });
    expect(renderer?.root.findByType('p').children.join('')).toBe('');

    act(() => frame?.(160));
    const partial = renderer?.root.findByType('p').children.join('') ?? '';
    expect(partial.length).toBeGreaterThan(0);
    expect(partial).not.toBe('A newly received response appears progressively.');

    act(() => renderer?.root.findByType('button').props.onClick());
    expect(renderer?.root.findByType('p').children.join('')).toBe(
      'A newly received response appears progressively.',
    );
  });

  it('does not rewind for new callback identities and completes the reveal once', async () => {
    let frame: FrameRequestCallback | undefined;
    const cancelFrame = vi.fn();
    const firstComplete = vi.fn();
    const latestComplete = vi.fn();
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 7;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    let renderer: ReactTestRenderer | undefined;
    const text = 'Unrelated title refreshes must not restart this response.';

    await act(async () => {
      renderer = create(createElement(AssistantProgressiveText, {
        text,
        active: true,
        revealKey: 42,
        onComplete: firstComplete,
      }));
    });
    act(() => frame?.(160));
    const beforeRefresh = renderer!.root.findByType('p').children.join('');

    await act(async () => {
      renderer!.update(createElement(AssistantProgressiveText, {
        text,
        active: true,
        revealKey: 42,
        onComplete: latestComplete,
        onProgress: () => undefined,
      }));
    });
    expect(renderer!.root.findByType('p').children.join('')).toBe(beforeRefresh);

    act(() => frame?.(3_000));
    expect(renderer!.root.findByType('p').children.join('')).toBe(text);
    expect(firstComplete).not.toHaveBeenCalled();
    expect(latestComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer!.update(createElement(AssistantProgressiveText, {
        text,
        active: false,
        revealKey: 42,
        onComplete: vi.fn(),
      }));
    });
    expect(renderer!.root.findByType('p').children.join('')).toBe(text);
    expect(latestComplete).toHaveBeenCalledTimes(1);

    await act(async () => renderer!.unmount());
    expect(cancelFrame).toHaveBeenCalled();
  });

  it('starts a distinct response identity from the beginning while equivalent reconciliation stays complete', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback;
      return 8;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(createElement(AssistantProgressiveText, {
        text: 'First response', active: true, revealKey: 'response-1',
      }));
    });
    act(() => renderer!.root.findByType('button').props.onClick());
    await act(async () => {
      renderer!.update(createElement(AssistantProgressiveText, {
        text: 'First response', active: true, revealKey: 'response-1',
      }));
    });
    expect(renderer!.root.findByType('p').children.join('')).toBe('First response');

    await act(async () => {
      renderer!.update(createElement(AssistantProgressiveText, {
        text: 'Retry response', active: true, revealKey: 'response-2',
      }));
    });
    expect(renderer!.root.findByType('p').children.join('')).toBe('');
    act(() => frame?.(3_000));
    expect(renderer!.root.findByType('p').children.join('')).toBe('Retry response');
  });

  it('renders the complete response immediately for reduced motion', async () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(createElement(AssistantProgressiveText, {
        text: 'Complete without motion',
        active: true,
      }));
    });

    expect(renderer?.root.findByType('p').children.join('')).toBe('Complete without motion');
  });
});

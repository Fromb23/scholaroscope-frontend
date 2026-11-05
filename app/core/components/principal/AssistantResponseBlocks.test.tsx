import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AssistantResponseBlocks } from './AssistantResponseBlocks';
import type { AssistantResponseBlock } from '@/app/core/types/assistant';

function render(blocks: AssistantResponseBlock[]): string {
  return renderToStaticMarkup(createElement(AssistantResponseBlocks, { blocks }));
}

describe('AssistantResponseBlocks', () => {
  it('renders metrics from the governed attendance response', () => {
    const html = render([{ type: 'metrics', values: { present: 20, absent: 2 } }]);

    expect(html).toContain('Present');
    expect(html).toContain('20');
    expect(html).toContain('Absent');
    expect(html).toContain('2');
  });

  it('renders verified learner table values exactly as supplied', () => {
    const html = render([{
      type: 'table',
      columns: ['learner_id', 'name'],
      rows: [{ learner_id: 101, name: 'Amina Noor' }],
    }]);

    expect(html).toContain('101');
    expect(html).toContain('Amina Noor');
  });

  it('renders clarification as a neutral prompt', () => {
    const html = render([{ type: 'clarification', question: 'Which cohort and subject?' }]);

    expect(html).toContain('Which cohort and subject?');
    expect(html).not.toContain('role="alert"');
  });

  it('renders unsupported capability as a limitation rather than a failure', () => {
    const html = render([{
      type: 'unsupported_capability',
      code: 'unsupported_request',
      message: 'No supported tool can answer this request.',
    }]);

    expect(html).toContain('No supported tool can answer this request.');
    expect(html).not.toContain('role="alert"');
  });

  it('renders provider unavailability with its backend code and message', () => {
    const html = render([{
      type: 'error',
      code: 'intelligence_unavailable',
      message: 'Assistant intelligence is unavailable.',
    }]);

    expect(html).toContain('role="alert"');
    expect(html).toContain('Assistant intelligence is unavailable.');
    expect(html).toContain('intelligence_unavailable');
  });

  it('renders markdown as escaped text', () => {
    const html = render([{ type: 'markdown', text: '<script>alert(1)</script>' }]);

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('ignores unknown blocks without crashing the conversation', () => {
    const html = render([
      { type: 'future_block', value: 'not trusted' } as unknown as AssistantResponseBlock,
      { type: 'markdown', text: 'Known content remains visible.' },
    ]);

    expect(html).toContain('Known content remains visible.');
    expect(html).not.toContain('not trusted');
  });
});

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

  it('suppresses legacy learner database identifiers in persisted results', () => {
    const html = render([{
      type: 'table',
      columns: ['learner_id', 'name'],
      rows: [{ learner_id: 101, name: 'Amina Noor' }],
    }]);

    expect(html).not.toContain('101');
    expect(html).not.toContain('Learner ID');
    expect(html).toContain('Amina Noor');
  });

  it('renders admission numbers as strings and uses a neutral missing placeholder', () => {
    const html = render([{
      type: 'table',
      columns: ['admission_number', 'name'],
      rows: [
        { admission_number: '00A17', name: 'Amina Noor' },
        { admission_number: null, name: 'Missing Number' },
      ],
    }]);

    expect(html).toContain('Admission number');
    expect(html).toContain('00A17');
    expect(html).toContain('Unavailable');
    expect(html).not.toContain('Learner Id');
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
    expect(html).not.toContain('rounded-lg border');
  });

  it('renders the production unavailable-operation contract as one readable response without Retry', () => {
    const html = render([{
      type: 'unsupported_capability',
      code: 'operation_unavailable',
      message: 'I understand you want an attendance average. I cannot calculate averages. I can list verified absences for one cohort, subject, and date.',
      presentation_owner: 'SERVER',
      capability_context: {
        outcome: 'OPERATION_UNAVAILABLE',
        requested_operation: 'an attendance average',
        limitation: 'I cannot calculate averages.',
        scope_labels: [
          { label: 'Grade 10', entity_type: 'LEVEL', source: 'USER_PROVIDED' },
        ],
        supported_alternative: {
          description: 'list verified absences for one cohort, subject, and date',
          required_scope_labels: ['one cohort', 'one subject', 'one date'],
        },
      },
    }]);

    expect(html.match(/attendance average/g)).toHaveLength(1);
    expect(html).toContain('one cohort, subject, and date');
    expect(html).not.toContain('Retry');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('attendance.list_absent_learners');
  });

  it('keeps mixed useful content and one unboxed capability boundary', () => {
    const html = render([
      { type: 'markdown', text: 'Absence can identify learners who need support.' },
      {
        type: 'unsupported_capability', code: 'unsupported_capability',
        message: 'Live results are not available.', presentation_owner: 'SERVER',
        model_context_retained: true,
      },
    ]);
    expect(html).toContain('learners who need support');
    expect(html.match(/Live results are not available/g)).toHaveLength(1);
  });

  it('offers retry only for a genuine execution failure when supplied by its turn', () => {
    const html = renderToStaticMarkup(createElement(AssistantResponseBlocks, {
      blocks: [{ type: 'error', code: 'assistant_response_unavailable', message: 'internal' }],
      onRetry: () => undefined,
    }));
    expect(html).toContain('>Retry</button>');
    expect(render([{ type: 'unsupported_capability', code: 'unsupported_capability', message: 'Unavailable.' }]))
      .not.toContain('>Retry</button>');
  });

  it('renders a safe retry message without backend diagnostics', () => {
    const html = render([{
      type: 'error',
      code: 'intelligence_unavailable',
      message: 'Assistant intelligence is unavailable.',
    }]);

    expect(html).toContain('role="alert"');
    expect(html).toContain('The response could not be completed. Please retry.');
    expect(html).not.toContain('Assistant intelligence is unavailable.');
    expect(html).not.toContain('intelligence_unavailable');
  });

  it('maps typed provider failures without exposing internal diagnostics', () => {
    const timeout = render([{
      type: 'error',
      code: 'assistant_provider_timeout',
      message: 'intelligence_timeout',
    }]);
    const rejected = render([{
      type: 'error',
      code: 'assistant_response_rejected',
      message: 'provider_malformed_output',
    }]);

    expect(timeout).toContain('The response took too long to complete. Please retry.');
    expect(timeout).not.toContain('intelligence_timeout');
    expect(rejected).toContain('I couldn’t complete that response safely. Please retry.');
    expect(rejected).not.toContain('provider_malformed_output');
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

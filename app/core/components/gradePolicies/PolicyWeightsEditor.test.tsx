import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PolicyWeightsEditor } from './PolicyWeightsEditor';

describe('policy weights editor', () => {
  it('explains assessment weights in academic language', () => {
    const html = renderToStaticMarkup(
      <PolicyWeightsEditor
        entries={[
          { type: 'CAT', weight: '40' },
          { type: 'MAIN_EXAM', weight: '60' },
        ]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain('These decide how much each evidence category contributes to the final report. Positive weights must add up to 100.');
  });
});

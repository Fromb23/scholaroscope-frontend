import { describe, expect, it } from 'vitest';

import { formatDocumentTitle, resolvePageIdentity } from '@/app/core/pageIdentity/pageIdentity';
import './pageIdentityExtension';

describe('schemes page identity extension', () => {
  it('registers the schemes fallback inside the plugin', () => {
    const label = resolvePageIdentity('/schemes').displayLabel;
    expect(label).toBe('Schemes of Work');
    expect(formatDocumentTitle(label)).toBe('Schemes of Work | Scholaroscope');
  });
});

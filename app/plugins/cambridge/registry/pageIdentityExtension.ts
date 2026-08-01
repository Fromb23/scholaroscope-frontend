'use client';

import { registerPageIdentityRoute } from '@/app/core/pageIdentity/pageIdentity';

registerPageIdentityRoute({
  pattern: /^\/cambridge(?:\/|$)/,
  descriptor: {
    pageKind: 'cambridge.home',
    displayLabel: 'Cambridge',
    parentSection: 'Cambridge',
  },
});

registerPageIdentityRoute({
  pattern: /^\/cambridge\/authoring(?:\/|$)/,
  descriptor: {
    pageKind: 'cambridge.authoring',
    displayLabel: 'Cambridge Authoring',
    parentSection: 'Cambridge',
  },
});

registerPageIdentityRoute({
  pattern: /^\/cambridge\/setup(?:\/|$)/,
  descriptor: {
    pageKind: 'cambridge.setup',
    displayLabel: 'Cambridge Setup',
    parentSection: 'Cambridge',
  },
});

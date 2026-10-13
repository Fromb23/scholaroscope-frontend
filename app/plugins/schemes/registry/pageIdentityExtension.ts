'use client';

import { registerPageIdentityRoute } from '@/app/core/pageIdentity/pageIdentity';

registerPageIdentityRoute({
  pattern: /^\/schemes$/,
  descriptor: {
    pageKind: 'schemes.list',
    displayLabel: 'Schemes of Work',
    parentSection: 'Schemes',
  },
});

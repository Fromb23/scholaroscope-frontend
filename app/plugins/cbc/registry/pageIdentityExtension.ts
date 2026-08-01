'use client';

import { registerPageIdentityRoute } from '@/app/core/pageIdentity/pageIdentity';

registerPageIdentityRoute({
  pattern: /^\/cbc\/browser(?:\/|$)/,
  descriptor: {
    pageKind: 'cbc.browser',
    displayLabel: 'CBC Curriculum Browser',
    parentSection: 'CBC',
  },
});

registerPageIdentityRoute({
  pattern: /^\/cbc\/progress(?:\/|$)/,
  descriptor: {
    pageKind: 'cbc.progress',
    displayLabel: 'CBC Progress',
    parentSection: 'CBC',
  },
});

registerPageIdentityRoute({
  pattern: /^\/cbc\/report-policies(?:\/|$)/,
  descriptor: {
    pageKind: 'cbc.report_policies',
    displayLabel: 'CBC Report Policies',
    parentSection: 'CBC',
  },
});

registerPageIdentityRoute({
  pattern: /^\/cbc\/teaching(?:\/|$)/,
  descriptor: {
    pageKind: 'cbc.teaching',
    displayLabel: 'CBC Teaching',
    parentSection: 'CBC',
  },
});

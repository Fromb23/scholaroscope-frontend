// ============================================================================
// app/plugins/cambridge/registry/navExtension.ts
//
// Registers Cambridge nav badge reporter.
// NavBadgeProvider mounts all registered reporters in a hidden span.
// ============================================================================

'use client';

import { useEffect } from 'react';
import { registerNavBadgeReporter, useSetNavBadge } from '@/app/core/registry/navBadges';

function CambridgeBadgeReporter() {
  const set = useSetNavBadge();

  useEffect(() => {
    // TODO: Replace with actual unread count hook when available
    set('cambridge', 0);
  }, [set]);

  return null;
}

registerNavBadgeReporter(CambridgeBadgeReporter);

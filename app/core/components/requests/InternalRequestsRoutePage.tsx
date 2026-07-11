'use client';

import type { ComponentType } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { supportsInternalRequests } from '@/app/core/lib/workspaceGovernance';
import { InternalRequestsNotApplicable } from '@/app/core/components/requests/InternalRequestsNotApplicable';

interface InternalRequestsRoutePageProps {
  Component: ComponentType;
}

export function InternalRequestsRoutePage({ Component }: InternalRequestsRoutePageProps) {
  const { capabilities } = useAuth();

  if (!supportsInternalRequests(capabilities)) {
    return <InternalRequestsNotApplicable />;
  }

  return <Component />;
}

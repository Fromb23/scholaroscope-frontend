// ============================================================================
// app/context/OrganizationContext.tsx
// NEW: Provides organization ID to child components when SuperAdmin is viewing
// a specific org's detail page
// ============================================================================

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { resolveScopedOrganizationId } from '@/app/core/lib/organizationScope';

interface OrganizationContextType {
    organizationId: number | null;
}

// Create context with default null value
const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({
    children,
    organizationId,
}: {
    children: ReactNode;
    organizationId: number | null;
}) {
    return (
        <OrganizationContext.Provider value={{ organizationId }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganizationContext() {
    const context = useContext(OrganizationContext);
    const { activeOrg } = useAuth();
    const organizationId = resolveScopedOrganizationId(
        context?.organizationId,
        activeOrg?.id ?? null,
    );

    return { organizationId };
}

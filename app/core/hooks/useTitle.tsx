// app/hooks/useTitle.ts
'use client';

// Backwards-compatible export for older imports. App Router title ownership
// lives in app/core/pageIdentity and does not use next/head.
export { useSemanticPageTitle as useTitle } from '@/app/core/pageIdentity/PageTitleProvider';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/docs/SYSTEM_BOUNDARIES.md'),
  'utf8',
);

describe('system boundary doctrine', () => {
  it('defines the required frontend system boundaries', () => {
    [
      'Backend domain law is canonical',
      'Platform Boundary',
      'Workspace / Tenant Boundary',
      'Governance Boundary',
      'Product / Plugin / Subscription Boundary',
      'Academic Lifecycle Boundary',
      'Authority Boundary',
      'Data Pipeline Boundary',
      'State Boundary',
      'UI / Rendering Boundary',
      'Error Boundary',
      'Testing / Invariant Boundary',
      'app/core/docs/AUTHORITY_HIERARCHY.md',
    ].forEach((term) => expect(source).toContain(term));
  });

  it('keeps frontend state layered below the backend contract', () => {
    [
      'Backend DB/domain state',
      'API response',
      'React Query server state',
      'Auth context / workspace context',
      'URL state for filters and navigation',
      'Local component/form state',
      'Visual UI state',
      'Error state must come through `resolveAppError`',
    ].forEach((term) => expect(source).toContain(term));
  });

  it('documents forbidden frontend boundary patterns and feature checklist fields', () => {
    [
      'No raw `error.response.data.detail` rendering.',
      'No `activeRole`-only mutation decisions.',
      'No local date-only lifecycle mutation decisions.',
      'No deriving backend-owned options from displayed rows when an options endpoint exists.',
      'No hardcoded workspace-wide authority.',
      'No page-specific permission matrices.',
      'No plugin access based only on route names.',
      'No direct mutation without backend validation.',
      'Source endpoint',
      'Query key',
      'Mutation endpoint',
      'Invalidation keys',
      'Local state fields',
      'URL state fields',
      'Error state and error channel',
      'Read-only, blocked, and not-applicable state',
      'Backend action/capability fields used',
      'Tests for forbidden state',
    ].forEach((term) => expect(source).toContain(term));
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('terms subscription gate frontend behavior', () => {
  it('renewal-required state keeps the historical terms UI accessible', () => {
    const terms = source('app/core/components/academic/terms/TermsPage.tsx');
    expect(terms).toContain('subscriptionSummaryQuery.data?.renewal_required');
    expect(terms).toContain('Existing academic records remain available.');
    expect(terms).toContain('<Table>');
    expect(terms).not.toContain('Access denied');
  });

  it('terms page shows the backend subscription-required message', () => {
    const terms = source('app/core/components/academic/terms/TermsPage.tsx');
    expect(terms).toContain('subscriptionSummaryQuery.data.term_creation_message');
    expect(terms).toContain("extractErrorCode(err as ApiError) === 'subscription_required_for_term'");
    expect(terms).toContain("setPageError(resolveErrorMessage(err, 'Subscription required for this term.'))");
  });

  it('explicit backend error code is preserved through the term creation hook', () => {
    const hook = source('app/core/hooks/useAcademic.ts');
    const errors = source('app/core/types/errors.ts');
    expect(hook).toContain('wrapped.code = extractErrorCode(apiError)');
    expect(hook).toContain('wrapped.response = apiError.response');
    expect(errors).toContain('export function extractErrorCode');
  });

  it('renewal-required handling does not redirect or lock the workspace', () => {
    const terms = source('app/core/components/academic/terms/TermsPage.tsx');
    const renewalBlock = terms.slice(
      terms.indexOf('subscriptionSummaryQuery.data?.renewal_required'),
      terms.indexOf('<Card>', terms.indexOf('subscriptionSummaryQuery.data?.renewal_required'))
    );
    expect(renewalBlock).not.toContain('router.push');
    expect(renewalBlock).not.toContain('return (');
  });

  it('honors authoritative configuration metadata for ordinary edit and delete actions', () => {
    const terms = source('app/core/components/academic/terms/TermsPage.tsx');
    const types = source('app/core/types/academic.ts');

    expect(types).toContain("configuration_state: 'SETUP_OPEN' | 'SETUP_LOCKED' | 'HISTORICAL_LOCKED'");
    expect(types).toContain('configuration_actions:');
    expect(types).toContain('can_edit_term: boolean');
    expect(types).toContain('can_delete_term: boolean');
    expect(types).toContain('configuration_locked_reason: string | null');
    expect(terms).toContain('term.configuration_actions.can_edit_term');
    expect(terms).toContain('term.configuration_actions.can_delete_term');
    expect(terms).toContain('termLockedReason(term)');
    expect(terms).toContain('Term configuration locked');
    expect(terms).toContain("aria-label={actionLockedReason ?? 'Term actions locked'}");
    expect(terms).not.toContain('isCurrentAcademicYear && isAdminLike');
  });
});

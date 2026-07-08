import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  GuidedPolicySetup,
  InactivePolicyNotice,
  PolicyHierarchyGuide,
  PolicyScopeMeaningGuide,
} from './PolicyGuidance';

describe('policy guidance', () => {
  it('explains the active policy hierarchy', () => {
    const html = renderToStaticMarkup(<PolicyHierarchyGuide />);

    expect(html).toContain('Scholaroscope uses the most specific active policy available:');
    expect(html).toContain('Class subject + term');
    expect(html).toContain('Registered subject / level');
    expect(html).toContain('Inactive policies are saved but not used.');
  });

  it('explains selected policy scope meaning', () => {
    const html = renderToStaticMarkup(<PolicyScopeMeaningGuide />);

    expect(html).toContain('Workspace default:');
    expect(html).toContain('fallback for the organization');
    expect(html).toContain('Class subject policy:');
    expect(html).toContain('applies only to this subject in this class');
  });

  it('renders guided setup prompts', () => {
    const html = renderToStaticMarkup(<GuidedPolicySetup />);

    expect(html).toContain('What should this policy apply to?');
    expect(html).toContain('What should count in the final report?');
    expect(html).toContain('What must exist before the report becomes final?');
    expect(html).toContain('How should repeated evidence be combined?');
  });

  it('renders inactive policy notice and actions', () => {
    const html = renderToStaticMarkup(
      <InactivePolicyNotice
        onActivate={vi.fn()}
        onCreateActiveCopy={vi.fn()}
        backHref="/cbc/report-policies"
      />,
    );

    expect(html).toContain('This policy is inactive. It is saved but will not be used in report computation.');
    expect(html).toContain('Activate policy');
    expect(html).toContain('Create new active policy from this one');
    expect(html).toContain('Back to active policies');
    expect(html).toContain('Recompute support requires backend activation workflow.');
  });
});

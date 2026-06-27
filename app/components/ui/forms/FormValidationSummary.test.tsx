import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FormValidationSummary } from './FormValidationSummary';

describe('FormValidationSummary', () => {
  it('renders nothing when there are no field errors', () => {
    const html = renderToStaticMarkup(<FormValidationSummary fieldErrors={{}} />);

    expect(html).toBe('');
  });

  it('renders accessible summary copy and field labels', () => {
    const html = renderToStaticMarkup(
      <FormValidationSummary
        fieldErrors={{
          title: 'Session title is required.',
          venue: 'Venue is required.',
        }}
        fieldLabels={{
          title: 'Session title',
          venue: 'Venue',
        }}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('2 fields need correction.');
    expect(html).toContain('Review the highlighted fields before submitting.');
    expect(html).toContain('Session title:');
    expect(html).toContain('Venue is required.');
  });

  it('uses clickable field controls when focus callback is provided', () => {
    const html = renderToStaticMarkup(
      <FormValidationSummary
        fieldErrors={{ workspace_name: 'Workspace name is required' }}
        fieldLabels={{ workspace_name: 'Workspace name' }}
        onFieldClick={vi.fn()}
      />,
    );

    expect(html).toContain('<button');
    expect(html).toContain('1 field needs correction.');
  });
});

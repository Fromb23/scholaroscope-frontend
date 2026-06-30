import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { ReleaseBadge } from './ReleaseBadge';

const ORIGINAL_ENV = { ...process.env };

describe('ReleaseBadge', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('renders the deployed build version without double-prefixing v', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = 'v0.6.0';
    process.env.NEXT_PUBLIC_GIT_SHA = 'abcdef1234567890';
    process.env.NEXT_PUBLIC_RELEASE_CHANNEL = 'production';

    const html = renderToStaticMarkup(<ReleaseBadge />);

    expect(html).toContain('ScholaroScope v0.6.0');
    expect(html).not.toContain('vv0.6.0');
    expect(html).toContain('sha abcdef1');
  });

  it('renders dev when build metadata is unavailable', () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;

    const html = renderToStaticMarkup(<ReleaseBadge />);

    expect(html).toContain('ScholaroScope dev');
  });
});

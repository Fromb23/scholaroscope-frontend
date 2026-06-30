import { afterEach, describe, expect, it } from 'vitest';
import { formatReleaseVersion, getReleaseInfo } from './releaseInfo';

const ORIGINAL_ENV = { ...process.env };

describe('releaseInfo', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('falls back to dev when build metadata is absent', () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.NEXT_PUBLIC_GIT_SHA;
    delete process.env.NEXT_PUBLIC_RELEASE_CHANNEL;
    delete process.env.NEXT_PUBLIC_BUILD_TIME;

    expect(getReleaseInfo()).toMatchObject({
      version: 'dev',
      displayVersion: 'dev',
      isDev: true,
    });
  });

  it('uses deploy metadata from public build environment variables', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = '0.6.0';
    process.env.NEXT_PUBLIC_GIT_SHA = '1234567890abcdef';
    process.env.NEXT_PUBLIC_RELEASE_CHANNEL = 'production';
    process.env.NEXT_PUBLIC_BUILD_TIME = '2026-06-30T12:00:00Z';

    expect(getReleaseInfo()).toEqual({
      version: '0.6.0',
      displayVersion: 'v0.6.0',
      gitSha: '1234567890abcdef',
      shortSha: '1234567',
      channel: 'production',
      buildTime: '2026-06-30T12:00:00Z',
      isDev: false,
    });
  });

  it('does not duplicate a leading v', () => {
    expect(formatReleaseVersion('v0.6.0')).toBe('v0.6.0');
  });
});

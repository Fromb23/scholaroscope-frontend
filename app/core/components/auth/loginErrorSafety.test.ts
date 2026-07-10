import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const loginSource = readFileSync(
  join(process.cwd(), 'app/core/components/auth/LoginPage.tsx'),
  'utf8',
);
const platformRedirectSource = readFileSync(
  join(process.cwd(), 'app/core/auth/platformRedirect.ts'),
  'utf8',
);

describe('login error safety contract', () => {
  it('renders platform-login-required as customer-safe copy', () => {
    expect(loginSource).toContain("errorEnvelope?.code === 'platform_login_required'");
    expect(loginSource).toContain('Platform administrators sign in through the Scholaroscope control plane.');
    expect(loginSource).toContain('Open platform console');
    expect(loginSource).toContain("href={getPlatformAppUrl('/login')}");
    expect(loginSource).not.toContain('admin_url');
    expect(loginSource).not.toContain('localhost');
  });

  it('uses controlled auth failure copy instead of raw transport detail', () => {
    expect(loginSource).toContain('Email or password is incorrect.');
    expect(loginSource).toContain('Scholaroscope could not be reached. Try again.');
    expect(loginSource).not.toContain('Network Error');
  });

  it('gets the platform console target from frontend configuration', () => {
    expect(platformRedirectSource).toContain('NEXT_PUBLIC_PLATFORM_APP_URL');
    expect(platformRedirectSource).toContain('https://admin.scholaroscope.com');
    expect(platformRedirectSource).not.toContain('admin_url');
  });
});

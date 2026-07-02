import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('DashboardClientShell logout transition', () => {
  it('does not turn intentional logout into protected-route sign-in redirect copy', () => {
    const source = read('app/(dashboard)/DashboardClientShell.tsx');
    const logoutEffectGuardIndex = source.indexOf('if (loggingOut) {');
    const organizationRefreshIndex = source.indexOf('router.refresh();');
    const unauthRedirectIndex = source.indexOf('router.replace(buildLoginPath(currentPath))');
    const logoutRenderIndex = source.indexOf('message="Signing out..."');
    const unauthCopyIndex = source.indexOf("'Redirecting to sign in...'");

    expect(source).toContain('loggingOut');
    expect(source).toContain('description="Returning to sign in."');
    expect(logoutEffectGuardIndex).toBeGreaterThan(-1);
    expect(organizationRefreshIndex).toBeGreaterThan(-1);
    expect(unauthRedirectIndex).toBeGreaterThan(-1);
    expect(logoutEffectGuardIndex).toBeLessThan(organizationRefreshIndex);
    expect(logoutEffectGuardIndex).toBeLessThan(unauthRedirectIndex);
    expect(logoutRenderIndex).toBeGreaterThan(-1);
    expect(unauthCopyIndex).toBeGreaterThan(-1);
    expect(logoutRenderIndex).toBeLessThan(unauthCopyIndex);
  });
});

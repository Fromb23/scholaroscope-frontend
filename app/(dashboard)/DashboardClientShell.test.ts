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
    const unauthRedirectIndex = source.indexOf('router.replace(destination)');
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

describe('DashboardClientShell offline boot state', () => {
  it('renders the offline retry state instead of redirecting to login when boot failed offline', () => {
    const source = read('app/(dashboard)/DashboardClientShell.tsx');
    const offlineRenderIndex = source.indexOf('if (!loading && !user && offline) {');
    const offlineRetryIndex = source.indexOf('return <OfflineRetryState />;', offlineRenderIndex);
    const resolvingStateIndex = source.indexOf('return <PermissionResolvingState fullScreen message={resolvingMessage} />;');

    expect(source).toContain("import { OfflineRetryState } from '@/app/offline/OfflineRetryState';");
    expect(source).toContain('offline,');
    expect(offlineRenderIndex).toBeGreaterThan(-1);
    expect(offlineRetryIndex).toBeGreaterThan(offlineRenderIndex);
    expect(offlineRetryIndex).toBeLessThan(resolvingStateIndex);
  });

  it('does not issue the protected-route login redirect while offline is true', () => {
    const source = read('app/(dashboard)/DashboardClientShell.tsx');
    const unauthStart = source.indexOf('if (!user) {');
    const offlineGuardIndex = source.indexOf('if (offline) {', unauthStart);
    const offlineReturnIndex = source.indexOf('return;', offlineGuardIndex);
    const redirectIndex = source.indexOf('router.replace(destination)', unauthStart);

    expect(offlineGuardIndex).toBeGreaterThan(unauthStart);
    expect(offlineReturnIndex).toBeGreaterThan(offlineGuardIndex);
    expect(offlineReturnIndex).toBeLessThan(redirectIndex);
  });

  it('redirects an unauthenticated deep link once and keeps terminal authenticated failures stable', () => {
    const source = read('app/(dashboard)/DashboardClientShell.tsx');

    expect(source).toContain('lastRedirectRef.current !== destination');
    expect(source).toContain('lastRedirectRef.current = destination');
    expect(source).toContain('title="Workspace access unavailable"');
    expect(source).toContain('title="Report access denied"');
    expect(source).not.toContain('getUnauthorizedRouteFallback');
    expect(source).not.toContain("buildLoginPath(currentPath, { reason: 'no_access' })");
  });

  it('redirects locked downstream academic setup pages to the backend current setup action', () => {
    const shell = read('app/(dashboard)/DashboardClientShell.tsx');

    expect(shell).toContain('getAcademicSetupStepKeyForPath(pathname)');
    expect(shell).toContain("getAcademicSetupPageState(academicSetupQuery.data, setupStepKey) === 'blocked'");
    expect(shell).toContain('isAcademicSetupOperationalAdminPath(pathname) || blockedSetupPath');
  });
});

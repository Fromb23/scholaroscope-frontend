import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function hasUseClientDirective(source: string) {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]\s*;?/.test(source);
}

function expectNoClientHookImports(source: string) {
  expect(source).not.toMatch(/from ['"]next\/navigation['"];?/);
  expect(source).not.toContain('@/app/context/AuthContext');
  expect(source).not.toContain('@/app/core/hooks/');
  expect(source).not.toMatch(/@\/app\/plugins\/[^/]+\/hooks\//);
  expect(source).not.toMatch(/\buse(?:State|Effect|Memo|Callback|Reducer|Ref|Params|SearchParams|Router|Pathname)\s*\(/);
}

describe('next-boundaries architecture', () => {
  it('passes the Next boundary checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-next-boundaries.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('keeps the dashboard layout as a server shell around the client auth/plugin island', () => {
    const layout = read('app/(dashboard)/layout.tsx');
    const clientShell = read('app/(dashboard)/DashboardClientShell.tsx');

    expect(hasUseClientDirective(layout)).toBe(false);
    expect(layout).toContain('DashboardClientShell');
    expect(hasUseClientDirective(clientShell)).toBe(true);
    expect(clientShell).toContain('PluginRegistryProvider');
    expect(clientShell).toContain('usePluginRegistryStatus');
    expect(clientShell).toContain('PluginRouteLoadingState');
  });

  it('redirects unauthenticated dashboard users before plugin loading can block the route', () => {
    const clientShell = read('app/(dashboard)/DashboardClientShell.tsx');
    const unauthenticatedRedirectIndex = clientShell.indexOf('if (!user)');
    const pluginGateIndex = clientShell.indexOf('if (pluginRegistry.isRoutePluginLoading || pluginRegistry.error)');

    expect(unauthenticatedRedirectIndex).toBeGreaterThanOrEqual(0);
    expect(pluginGateIndex).toBeGreaterThanOrEqual(0);
    expect(unauthenticatedRedirectIndex).toBeLessThan(pluginGateIndex);
  });

  it('keeps converted report route shells server-renderable while rendering their client islands', () => {
    const convertedShells = [
      ['app/(dashboard)/reports/page.tsx', 'ReportsPage'],
      ['app/(dashboard)/reports/policies/page.tsx', 'ReportPoliciesHubPage'],
      ['app/(dashboard)/reports/grade-policies/page.tsx', 'GradePoliciesPage'],
      ['app/(dashboard)/reports/grade-policies/[id]/page.tsx', 'GradePolicyDetailPage'],
      ['app/(dashboard)/reports/instructor/teacher-report/page.tsx', 'TeacherPerformanceReportPage'],
    ];

    for (const [relativePath, componentName] of convertedShells) {
      const source = read(relativePath);

      expect(hasUseClientDirective(source)).toBe(false);
      expectNoClientHookImports(source);
      expect(source).toContain(componentName);
      expect(source).toContain(`<${componentName}`);
    }
  });

  it('keeps selected report internals as server shells over explicit client islands', () => {
    const reportShells = [
      {
        shellPath: 'app/core/components/reports/ReportsPage.tsx',
        shellName: 'ReportsPage',
        clientPath: 'app/core/components/reports/ReportSurfaceRouterClient.tsx',
        clientName: 'ReportSurfaceRouterClient',
      },
      {
        shellPath: 'app/core/components/reports/ReportPoliciesHubPage.tsx',
        shellName: 'ReportPoliciesHubPage',
        clientPath: 'app/core/components/reports/ReportPoliciesHubPageClient.tsx',
        clientName: 'ReportPoliciesHubPageClient',
      },
      {
        shellPath: 'app/core/components/reports/GradePoliciesPage.tsx',
        shellName: 'GradePoliciesPage',
        clientPath: 'app/core/components/reports/GradePoliciesPageClient.tsx',
        clientName: 'GradePoliciesPageClient',
      },
    ];

    for (const { shellPath, shellName, clientPath, clientName } of reportShells) {
      const shell = read(shellPath);
      const client = read(clientPath);

      expect(hasUseClientDirective(shell)).toBe(false);
      expectNoClientHookImports(shell);
      expect(shell).toContain(`export function ${shellName}`);
      expect(shell).toContain(`<${clientName} />`);
      expect(clientPath.endsWith('Client.tsx')).toBe(true);
      expect(hasUseClientDirective(client)).toBe(true);
      expect(client).toContain(`export function ${clientName}`);
    }
  });

  it('scopes the route-level loading boundary to reports', () => {
    const source = read('app/(dashboard)/reports/loading.tsx');

    expect(hasUseClientDirective(source)).toBe(false);
    expect(source).toContain('PageSkeleton');
    expect(source).toContain('variant="report"');
  });
});

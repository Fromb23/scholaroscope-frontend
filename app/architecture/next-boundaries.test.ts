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

  it('keeps converted report route shells server-renderable while rendering their client islands', () => {
    const convertedShells = [
      ['app/(dashboard)/reports/page.tsx', 'ReportsPage'],
      ['app/(dashboard)/reports/policies/page.tsx', 'ReportPoliciesHubPage'],
      ['app/(dashboard)/reports/grade-policies/[id]/page.tsx', 'GradePolicyDetailPage'],
      ['app/(dashboard)/reports/instructor/teacher-report/page.tsx', 'TeacherPerformanceReportPage'],
    ];

    for (const [relativePath, componentName] of convertedShells) {
      const source = read(relativePath);

      expect(hasUseClientDirective(source)).toBe(false);
      expect(source).toContain(componentName);
      expect(source).toContain(`<${componentName}`);
    }
  });

  it('scopes the route-level loading boundary to reports', () => {
    const source = read('app/(dashboard)/reports/loading.tsx');

    expect(hasUseClientDirective(source)).toBe(false);
    expect(source).toContain('PageSkeleton');
    expect(source).toContain('variant="report"');
  });
});

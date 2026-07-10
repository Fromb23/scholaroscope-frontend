import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('Sidebar shell architecture', () => {
  it('renders release metadata through ReleaseBadge instead of a hardcoded version', () => {
    const source = read('app/components/layout/Sidebar.tsx');

    expect(source).toContain('ReleaseBadge');
    expect(source).toContain('<ReleaseBadge />');
    expect(source).not.toMatch(/\bv\d+\.\d+\.\d+/);
    expect(source).not.toContain('package.json');
  });

  it('keeps mobile layout selection in CSS instead of post-hydration width detection', () => {
    const context = read('app/context/SidebarContext.tsx');
    const sidebar = read('app/components/layout/Sidebar.tsx');

    expect(context).not.toContain('window.innerWidth');
    expect(context).not.toContain("addEventListener('resize'");
    expect(context).not.toContain('isMobileView');
    expect(sidebar).toContain('lg:hidden');
    expect(sidebar).toContain('lg:static');
  });

  it('keeps viewport metadata explicit in the root layout', () => {
    const layout = read('app/layout.tsx');

    expect(layout).toContain('export const viewport');
    expect(layout).toContain("width: 'device-width'");
    expect(layout).toContain('initialScale: 1');
  });

  it('preserves role-aware navigation dispatch', () => {
    const shell = read('app/(dashboard)/DashboardClientShell.tsx');
    const navConfig = read('app/components/layout/navConfig.ts');

    expect(shell).toContain('resolveNavConfig');
    expect(shell).toContain('getAvailablePolicySurfaces');
    expect(navConfig).not.toContain(`get${'Superadmin'}Nav`);
    expect(navConfig).toContain('getAdminNav');
    expect(navConfig).toContain('getInstructorNav');
  });
});

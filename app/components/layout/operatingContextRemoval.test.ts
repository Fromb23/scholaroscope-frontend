import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('operating-context switch removal', () => {
  it('does not render manual context switch controls in the product shell', () => {
    const sidebar = source('app/components/layout/Sidebar.tsx');
    const header = source('app/components/layout/Header.tsx');
    const auth = source('app/context/AuthContext.tsx');

    expect(sidebar).not.toContain('setActiveOperatingContext');
    expect(sidebar).not.toContain('availableOperatingContexts.map');
    expect(header).not.toContain('Operating context');
    expect(header).not.toContain('setActiveOperatingContext');
    expect(header).not.toContain('availableOperatingContexts.map');
    expect(auth).toContain('isSelfManagedTeachingOwnerProjection(capabilities)');
    expect(auth).toContain("return 'WORKSPACE_MANAGEMENT'");
  });
});

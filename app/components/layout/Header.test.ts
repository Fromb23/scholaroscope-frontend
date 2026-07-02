import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Header user dropdown', () => {
  it('keeps instructor settings out of the dropdown and includes the personal dark toggle', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/layout/Header.tsx'), 'utf8');

    expect(source).not.toContain('ThemeModeSelector');
    expect(source).not.toContain('Organization Custom');
    expect(source).toContain('View Profile');
    expect(source).toContain("activeRole === 'ADMIN'");
    expect(source).toContain('showSettingsLink');
    expect(source).toContain('Scholaroscope Dark');
    expect(source).toContain('Scholaroscope Light');
    expect(source).toContain('Logout');
  });

  it('routes logout locally to login and disables the logout button while processing', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/layout/Header.tsx'), 'utf8');

    expect(source).toContain('const [isLoggingOut, setIsLoggingOut] = useState(false)');
    expect(source).toContain('const logoutPending = isLoggingOut || loggingOut');
    expect(source).toContain('setDropdownOpen(false);');
    expect(source).toContain('setOrgDropdownOpen(false);');
    expect(source).toContain("window.location.replace('/login')");
    expect(source).not.toContain("router.push('/login')");
    expect(source).not.toContain("router.replace('/login')");
    expect(source).not.toContain('buildLoginPath');
    expect(source).not.toContain('next=');
    expect(source).toContain('disabled={logoutPending}');
    expect(source).toContain('aria-busy={logoutPending}');
    expect(source).toContain("logoutPending ? 'Logging out...' : 'Logout'");
  });

  it('keeps mobile shell controls CSS-first and touch-friendly', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/layout/Header.tsx'), 'utf8');

    expect(source).toContain('lg:hidden');
    expect(source).toContain('min-h-11 min-w-11');
    expect(source).toContain('toggleSidebar');
  });
});

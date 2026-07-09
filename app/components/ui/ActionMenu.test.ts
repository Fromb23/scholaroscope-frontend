import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/components/ui/ActionMenu.tsx'),
  'utf8',
);

describe('ActionMenu responsive surface contract', () => {
  it('keeps the desktop absolute dropdown path', () => {
    expect(source).toContain("aria-haspopup={isMobileSheet ? 'dialog' : 'menu'}");
    expect(source).toContain('open && !isMobileSheet');
    expect(source).toContain('role="menu"');
    expect(source).toContain('theme-dropdown absolute top-full');
    expect(source).toContain("align === 'left' ? 'left-0' : 'right-0'");
  });

  it('renders mobile actions inside ResponsiveActionSheet', () => {
    expect(source).toContain("import { ResponsiveActionSheet } from '@/app/components/ui/actions'");
    expect(source).toContain('function useMobileActionSheet()');
    expect(source).toContain("window.matchMedia('(max-width: 767px)')");
    expect(source).toContain('isMobileSheet ? (');
    expect(source).toContain('<ResponsiveActionSheet');
    expect(source).toContain("title={buttonLabel.trim() || 'Actions'}");
    expect(source).toContain('preventBackdropClose={false}');
  });

  it('keeps mobile items tap-friendly and preserves item behavior', () => {
    expect(source).toContain("surface?: 'dropdown' | 'sheet'");
    expect(source).toContain("surface === 'sheet'");
    expect(source).toContain('min-h-12 rounded-lg px-4 py-3 text-base');
    expect(source).toContain('item.destructive');
    expect(source).toContain('disabled={item.disabled}');
    expect(source).toContain('if (item.href && !item.disabled)');
    expect(source).toContain('item.onSelect?.()');
    expect(source).toContain('onSelect={() => setOpen(false)}');
  });
});

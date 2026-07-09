import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { lockDocumentScroll } from './ResponsiveActionSheet';

function createStyle(initial: Partial<CSSStyleDeclaration> = {}) {
  return {
    overflow: '',
    position: '',
    top: '',
    left: '',
    right: '',
    width: '',
    paddingRight: '',
    overscrollBehavior: '',
    ...initial,
  } as unknown as CSSStyleDeclaration;
}

function createScrollLockFixture() {
  const bodyStyle = createStyle({
    overflow: 'auto',
    position: 'relative',
    top: '1px',
    left: '2px',
    right: '3px',
    width: 'calc(100% - 1rem)',
    paddingRight: '7px',
    overscrollBehavior: 'contain',
  });
  const htmlStyle = createStyle({
    overflow: 'clip',
    overscrollBehavior: 'auto',
  });
  const scrollTo = vi.fn();
  const doc = {
    body: { style: bodyStyle, scrollTop: 0 },
    documentElement: { style: htmlStyle, clientWidth: 980, scrollTop: 0 },
  } as unknown as Document;
  const win = {
    scrollY: 144,
    pageYOffset: 144,
    innerWidth: 1000,
    getComputedStyle: () => ({ paddingRight: '7px' }),
    scrollTo,
  } as unknown as Window;

  return { bodyStyle, htmlStyle, doc, win, scrollTo };
}

describe('ResponsiveActionSheet scroll lock', () => {
  it('locks body and document scrolling while preserving internal sheet scroll', () => {
    const { bodyStyle, htmlStyle, doc, win } = createScrollLockFixture();

    const unlock = lockDocumentScroll(doc, win);

    expect(htmlStyle.overflow).toBe('hidden');
    expect(htmlStyle.overscrollBehavior).toBe('none');
    expect(bodyStyle.overflow).toBe('hidden');
    expect(bodyStyle.position).toBe('fixed');
    expect(bodyStyle.top).toBe('-144px');
    expect(bodyStyle.left).toBe('0');
    expect(bodyStyle.right).toBe('0');
    expect(bodyStyle.width).toBe('100%');
    expect(bodyStyle.overscrollBehavior).toBe('none');
    expect(bodyStyle.paddingRight).toBe('27px');

    unlock();
  });

  it('restores prior body and document styles and scroll position on close', () => {
    const { bodyStyle, htmlStyle, doc, win, scrollTo } = createScrollLockFixture();

    const unlock = lockDocumentScroll(doc, win);
    unlock();

    expect(bodyStyle.overflow).toBe('auto');
    expect(bodyStyle.position).toBe('relative');
    expect(bodyStyle.top).toBe('1px');
    expect(bodyStyle.left).toBe('2px');
    expect(bodyStyle.right).toBe('3px');
    expect(bodyStyle.width).toBe('calc(100% - 1rem)');
    expect(bodyStyle.paddingRight).toBe('7px');
    expect(bodyStyle.overscrollBehavior).toBe('contain');
    expect(htmlStyle.overflow).toBe('clip');
    expect(htmlStyle.overscrollBehavior).toBe('auto');
    expect(scrollTo).toHaveBeenCalledWith(0, 144);
  });

  it('keeps nested locks active until the final foreground sheet closes', () => {
    const { bodyStyle, doc, win, scrollTo } = createScrollLockFixture();

    const unlockFirst = lockDocumentScroll(doc, win);
    const unlockSecond = lockDocumentScroll(doc, win);

    unlockFirst();
    expect(bodyStyle.position).toBe('fixed');
    expect(scrollTo).not.toHaveBeenCalled();

    unlockSecond();
    expect(bodyStyle.position).toBe('relative');
    expect(scrollTo).toHaveBeenCalledWith(0, 144);
  });
});

describe('ResponsiveActionSheet shell contract', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/components/ui/actions/ResponsiveActionSheet.tsx'),
    'utf8',
  );

  it('renders foreground sheets through a portal attached to document.body', () => {
    expect(source).toContain("import { createPortal } from 'react-dom'");
    expect(source).toContain('const [mounted, setMounted] = useState(false)');
    expect(source).toContain('const sheet = (');
    expect(source).toContain('return mounted ? createPortal(sheet, document.body) : sheet');
  });

  it('uses a true full-width mobile bottom sheet and desktop overrides', () => {
    expect(source).toContain('fixed inset-x-0 bottom-0');
    expect(source).toContain('w-screen');
    expect(source).toContain('max-w-none');
    expect(source).toContain('max-h-[92dvh]');
    expect(source).toContain('rounded-t-3xl rounded-b-none');
    expect(source).toContain('md:items-center md:justify-center');
    expect(source).toContain('md:rounded-lg');
  });

  it('keeps backdrop dismissal explicit and preserves horizontal body overflow', () => {
    expect(source).toContain('preventBackdropClose = true');
    expect(source).toContain('const allowBackdropClose = !closeDisabled && !preventBackdropClose');
    expect(source).toContain('disabled={!allowBackdropClose}');
    expect(source).toContain('overflow-x-auto overflow-y-auto');
  });

  it('renders a drag handle, header close button, scroll body, and sticky footer', () => {
    expect(source).toContain('md:hidden');
    expect(source).toContain('aria-label={closeLabel}');
    expect(source).toContain('min-h-0 flex-1 overflow-x-auto overflow-y-auto');
    expect(source).toContain('sticky bottom-0');
  });
});

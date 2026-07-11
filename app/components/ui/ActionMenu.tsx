'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/app/components/ui/Button';
import { ResponsiveActionSheet } from '@/app/components/ui/actions';

export interface ActionMenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  buttonLabel?: string;
  ariaLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
  hideLabelOnMobile?: boolean;
}

function ActionMenuItemButton({
  item,
  onSelect,
  actionRef,
  surface = 'dropdown',
}: {
  item: ActionMenuItem;
  onSelect: () => void;
  actionRef?: (node: HTMLAnchorElement | HTMLButtonElement | null) => void;
  surface?: 'dropdown' | 'sheet';
}) {
  const sizeClassName = surface === 'sheet'
    ? 'min-h-12 rounded-lg px-4 py-3 text-base'
    : 'rounded-md px-3 py-2 text-sm';
  const itemClassName = `flex w-full items-center gap-2 text-left transition-colors ${sizeClassName} ${
    item.disabled
      ? 'cursor-not-allowed opacity-50'
      : item.destructive
        ? 'text-[color:var(--color-danger)] theme-hover-danger'
        : 'theme-text theme-hover-surface'
  }`;

  if (item.href && !item.disabled) {
    return (
      <Link
        ref={actionRef as ((node: HTMLAnchorElement | null) => void) | undefined}
        href={item.href}
        role={surface === 'dropdown' ? 'menuitem' : undefined}
        className={itemClassName}
        onClick={onSelect}
      >
        {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
        <span className="min-w-0 flex-1">{item.label}</span>
      </Link>
    );
  }

  return (
    <button
      ref={actionRef as ((node: HTMLButtonElement | null) => void) | undefined}
      type="button"
      onClick={() => {
        if (item.disabled) {
          return;
        }
        item.onSelect?.();
        onSelect();
      }}
      disabled={item.disabled}
      role={surface === 'dropdown' ? 'menuitem' : undefined}
      className={itemClassName}
    >
      {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
      <span className="min-w-0 flex-1">{item.label}</span>
    </button>
  );
}

const VIEWPORT_COLLISION_PADDING = 8;
const MENU_OFFSET = 8;
const MIN_MENU_HEIGHT = 160;

function useMobileActionSheet(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener?.(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener?.(handleChange);
      }
    };
  }, []);

  return isMobile;
}

export function ActionMenu({
  items,
  buttonLabel = 'More',
  ariaLabel = 'Open more actions',
  variant = 'secondary',
  size = 'sm',
  align = 'right',
  className = '',
  menuClassName = '',
  hideLabelOnMobile = false,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
  const menuId = useId();
  const isMobileSheet = useMobileActionSheet();
  const visibleItems = useMemo(
    () => items.filter((item) => Boolean(item.label) && (item.href || item.onSelect)),
    [items]
  );

  const restoreButtonFocus = useCallback(() => {
    buttonRef.current?.focus();
  }, []);

  const closeMenu = useCallback((options: { restoreFocus?: boolean } = {}) => {
    setOpen(false);
    if (options.restoreFocus) {
      requestAnimationFrame(restoreButtonFocus);
    }
  }, [restoreButtonFocus]);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu || typeof window === 'undefined') {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width || 192;
    const naturalMenuHeight = menuRect.height || MIN_MENU_HEIGHT;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceAbove = buttonRect.top - VIEWPORT_COLLISION_PADDING - MENU_OFFSET;
    const spaceBelow = viewportHeight - buttonRect.bottom - VIEWPORT_COLLISION_PADDING - MENU_OFFSET;
    const placeAbove = spaceAbove >= naturalMenuHeight || spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      MIN_MENU_HEIGHT,
      placeAbove ? spaceAbove : spaceBelow,
    );
    const menuHeight = Math.min(naturalMenuHeight, availableHeight);
    const unclampedTop = placeAbove
      ? buttonRect.top - menuHeight - MENU_OFFSET
      : buttonRect.bottom + MENU_OFFSET;
    const maxLeft = viewportWidth - menuWidth - VIEWPORT_COLLISION_PADDING;
    const alignedLeft = align === 'left'
      ? buttonRect.left
      : buttonRect.right - menuWidth;
    const left = Math.min(
      Math.max(VIEWPORT_COLLISION_PADDING, alignedLeft),
      Math.max(VIEWPORT_COLLISION_PADDING, maxLeft),
    );
    const top = Math.min(
      Math.max(VIEWPORT_COLLISION_PADDING, unclampedTop),
      viewportHeight - menuHeight - VIEWPORT_COLLISION_PADDING,
    );

    setMenuStyle({
      position: 'fixed',
      left,
      top,
      maxHeight: availableHeight,
      overflowY: naturalMenuHeight > availableHeight ? 'auto' : undefined,
      visibility: 'visible',
      transformOrigin: placeAbove ? 'bottom right' : 'top right',
    });
  }, [align]);

  useEffect(() => {
    if (!open || isMobileSheet) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target)
        && !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu({ restoreFocus: true });
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeMenu, isMobileSheet, open]);

  useEffect(() => {
    if (!open || isMobileSheet) {
      return;
    }

    setMenuStyle({ position: 'fixed', visibility: 'hidden' });
    const frame = requestAnimationFrame(() => {
      updateMenuPosition();
      requestAnimationFrame(() => itemRefs.current.find(Boolean)?.focus());
    });

    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isMobileSheet, open, updateMenuPosition, visibleItems.length]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const focusableItems = itemRefs.current.filter(Boolean);
    if (focusableItems.length === 0) {
      return;
    }
    const activeIndex = focusableItems.findIndex((item) => item === document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? focusableItems.length - 1
        : event.key === 'ArrowDown'
          ? (activeIndex + 1) % focusableItems.length
          : (activeIndex <= 0 ? focusableItems.length : activeIndex) - 1;
    focusableItems[nextIndex]?.focus();
  };

  if (visibleItems.length === 0) {
    return null;
  }

  const dropdown = open && !isMobileSheet && typeof document !== 'undefined' ? createPortal(
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      style={menuStyle}
      onKeyDown={handleMenuKeyDown}
      className={`theme-dropdown z-50 min-w-[12rem] rounded-lg p-1 shadow-lg ${menuClassName}`}
    >
      <div className="space-y-1">
        {visibleItems.map((item, index) => (
          <ActionMenuItemButton
            key={`${item.label}:${item.href ?? 'action'}`}
            item={item}
            actionRef={(node) => {
              itemRefs.current[index] = node;
            }}
            onSelect={() => closeMenu({ restoreFocus: true })}
          />
        ))}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        ref={buttonRef}
        type="button"
        variant={variant}
        size={size}
        aria-haspopup={isMobileSheet ? 'dialog' : 'menu'}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (open) {
            closeMenu();
            return;
          }
          setOpen(true);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>
          {buttonLabel}
        </span>
      </Button>

      {dropdown}

      {isMobileSheet ? (
        <ResponsiveActionSheet
          open={open}
          onOpenChange={setOpen}
          title={buttonLabel.trim() || 'Actions'}
          size="sm"
          preventBackdropClose={false}
          bodyClassName="px-4"
        >
          <div className="space-y-2">
            {visibleItems.map((item) => (
              <ActionMenuItemButton
                key={`${item.label}:${item.href ?? 'action'}`}
                item={item}
                surface="sheet"
                onSelect={() => closeMenu({ restoreFocus: true })}
              />
            ))}
          </div>
        </ResponsiveActionSheet>
      ) : null}
    </div>
  );
}

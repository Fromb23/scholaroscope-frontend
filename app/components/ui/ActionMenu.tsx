'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/app/components/ui/Button';

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
}: {
  item: ActionMenuItem;
  onSelect: () => void;
}) {
  const itemClassName = `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
    item.disabled
      ? 'cursor-not-allowed opacity-50'
      : item.destructive
        ? 'text-[color:var(--color-danger)] theme-hover-danger'
        : 'theme-text theme-hover-surface'
  }`;

  if (item.href && !item.disabled) {
    return (
      <Link href={item.href} className={itemClassName} onClick={onSelect}>
        {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
        <span className="min-w-0 flex-1">{item.label}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (item.disabled) {
          return;
        }
        item.onSelect?.();
        onSelect();
      }}
      disabled={item.disabled}
      className={itemClassName}
    >
      {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
      <span className="min-w-0 flex-1">{item.label}</span>
    </button>
  );
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const visibleItems = useMemo(
    () => items.filter((item) => Boolean(item.label) && (item.href || item.onSelect)),
    [items]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>
          {buttonLabel}
        </span>
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`theme-dropdown absolute top-full z-30 mt-2 min-w-[12rem] rounded-lg p-1 ${
            align === 'left' ? 'left-0' : 'right-0'
          } ${menuClassName}`}
        >
          <div className="space-y-1">
            {visibleItems.map((item) => (
              <ActionMenuItemButton
                key={`${item.label}:${item.href ?? 'action'}`}
                item={item}
                onSelect={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

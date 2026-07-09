'use client';

import { ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

type ActionSurfaceSize = 'sm' | 'md' | 'lg' | 'xl';
type ActionSurfaceState = 'idle' | 'loading' | 'blocked' | 'warning' | 'success' | 'error';

interface ResponsiveActionSheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ActionSurfaceSize;
  closeDisabled?: boolean;
  preventBackdropClose?: boolean;
  closeOnEscape?: boolean;
  mobileMode?: 'bottom-sheet';
  desktopMode?: 'modal' | 'panel';
  state?: ActionSurfaceState;
  labelledById?: string;
  describedById?: string;
  closeLabel?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

const sizeClasses: Record<ActionSurfaceSize, string> = {
  sm: 'md:max-w-md',
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-4xl',
};

const stateRingClasses: Record<ActionSurfaceState, string> = {
  idle: '',
  loading: 'md:ring-1 md:ring-[color:color-mix(in_srgb,var(--color-info)_20%,transparent)]',
  blocked: 'md:ring-1 md:ring-[color:color-mix(in_srgb,var(--color-warning)_20%,transparent)]',
  warning: 'md:ring-1 md:ring-[color:color-mix(in_srgb,var(--color-warning)_20%,transparent)]',
  success: 'md:ring-1 md:ring-[color:color-mix(in_srgb,var(--color-success)_20%,transparent)]',
  error: 'md:ring-1 md:ring-[color:color-mix(in_srgb,var(--color-danger)_20%,transparent)]',
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function ResponsiveActionSheet({
  open,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeDisabled = false,
  preventBackdropClose = false,
  closeOnEscape = true,
  desktopMode = 'modal',
  state = 'idle',
  labelledById,
  describedById,
  closeLabel = 'Close action surface',
  panelClassName = '',
  bodyClassName = '',
}: ResponsiveActionSheetProps) {
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const titleId = labelledById ?? generatedTitleId;
  const descriptionId = describedById ?? (description ? generatedDescriptionId : undefined);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (closeDisabled) return;
    onOpenChange?.(false);
    onClose?.();
  }, [closeDisabled, onClose, onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? panelRef.current)?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (closeOnEscape) requestClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, open, requestClose]);

  if (!open) return null;

  const desktopPlacement = desktopMode === 'panel'
    ? 'md:items-stretch md:justify-end md:p-0'
    : 'md:items-center md:justify-center md:p-4';
  const desktopShape = desktopMode === 'panel'
    ? 'md:h-full md:max-h-full md:rounded-none md:rounded-l-lg'
    : 'md:max-h-[86vh] md:rounded-lg';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeDisabled || preventBackdropClose ? undefined : 'Close action surface'}
        className="absolute inset-0 h-full w-full bg-black/55 backdrop-blur-sm"
        onClick={closeDisabled || preventBackdropClose ? undefined : requestClose}
        tabIndex={-1}
      />

      <div className={`relative flex min-h-full items-end justify-center ${desktopPlacement}`}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-action-surface-state={state}
          className={[
            'theme-dropdown relative flex max-h-[92dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-2xl outline-none shadow-2xl',
            sizeClasses[size],
            desktopShape,
            stateRingClasses[state],
            panelClassName,
          ].join(' ')}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="shrink-0 border-b theme-border px-5 pb-4 pt-3 md:px-6 md:pt-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[color:var(--color-border-strong)] md:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="break-words text-lg font-semibold theme-text md:text-xl">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-sm theme-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={requestClose}
                disabled={closeDisabled}
                className="theme-focus-ring shrink-0 rounded-full p-1.5 theme-muted transition-colors hover:bg-[color:var(--color-hover-surface)] hover:text-[color:var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6 ${bodyClassName}`}>
            {children}
          </div>

          {footer ? (
            <div className="sticky bottom-0 shrink-0 border-t theme-border bg-[color:var(--color-dropdown)] px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] md:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

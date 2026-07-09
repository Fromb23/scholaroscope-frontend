'use client';

import {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
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

interface ScrollLockSnapshot {
  body: {
    overflow: string;
    position: string;
    top: string;
    left: string;
    right: string;
    width: string;
    paddingRight: string;
    overscrollBehavior: string;
  };
  html: {
    overflow: string;
    overscrollBehavior: string;
  };
  scrollY: number;
}

interface ScrollLockRecord {
  count: number;
  snapshot: ScrollLockSnapshot;
  win: Window;
}

interface DragState {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
}

const scrollLocks = new WeakMap<Document, ScrollLockRecord>();

function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia('(min-width: 768px)').matches;
}

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(
    'a,button,input,textarea,select,[role="button"],[data-action-sheet-no-drag]',
  ));
}

export function lockDocumentScroll(doc: Document, win: Window): () => void {
  const { body, documentElement } = doc;
  if (!body || !documentElement) return () => {};

  const existing = scrollLocks.get(doc);
  if (existing) {
    existing.count += 1;
    return () => {
      const current = scrollLocks.get(doc);
      if (!current) return;
      current.count -= 1;
      if (current.count > 0) return;

      const { snapshot } = current;
      body.style.overflow = snapshot.body.overflow;
      body.style.position = snapshot.body.position;
      body.style.top = snapshot.body.top;
      body.style.left = snapshot.body.left;
      body.style.right = snapshot.body.right;
      body.style.width = snapshot.body.width;
      body.style.paddingRight = snapshot.body.paddingRight;
      body.style.overscrollBehavior = snapshot.body.overscrollBehavior;
      documentElement.style.overflow = snapshot.html.overflow;
      documentElement.style.overscrollBehavior = snapshot.html.overscrollBehavior;
      scrollLocks.delete(doc);
      current.win.scrollTo?.(0, snapshot.scrollY);
    };
  }

  const scrollY = win.scrollY
    ?? win.pageYOffset
    ?? documentElement.scrollTop
    ?? body.scrollTop
    ?? 0;
  const snapshot: ScrollLockSnapshot = {
    body: {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      overscrollBehavior: body.style.overscrollBehavior,
    },
    html: {
      overflow: documentElement.style.overflow,
      overscrollBehavior: documentElement.style.overscrollBehavior,
    },
    scrollY,
  };

  const scrollbarWidth = Math.max(0, (win.innerWidth ?? documentElement.clientWidth) - documentElement.clientWidth);
  const computedPaddingRight = typeof win.getComputedStyle === 'function'
    ? Number.parseFloat(win.getComputedStyle(body).paddingRight) || 0
    : 0;

  documentElement.style.overflow = 'hidden';
  documentElement.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overscrollBehavior = 'none';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
  }

  scrollLocks.set(doc, { count: 1, snapshot, win });

  return () => {
    const current = scrollLocks.get(doc);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;

    body.style.overflow = snapshot.body.overflow;
    body.style.position = snapshot.body.position;
    body.style.top = snapshot.body.top;
    body.style.left = snapshot.body.left;
    body.style.right = snapshot.body.right;
    body.style.width = snapshot.body.width;
    body.style.paddingRight = snapshot.body.paddingRight;
    body.style.overscrollBehavior = snapshot.body.overscrollBehavior;
    documentElement.style.overflow = snapshot.html.overflow;
    documentElement.style.overscrollBehavior = snapshot.html.overscrollBehavior;
    scrollLocks.delete(doc);
    win.scrollTo?.(0, scrollY);
  };
}

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
  preventBackdropClose = true,
  closeOnEscape = true,
  desktopMode = 'modal',
  state = 'idle',
  labelledById,
  describedById,
  closeLabel = 'Close action surface',
  panelClassName = '',
  bodyClassName = '',
}: ResponsiveActionSheetProps) {
  const [mounted, setMounted] = useState(false);
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const titleId = labelledById ?? generatedTitleId;
  const descriptionId = describedById ?? (description ? generatedDescriptionId : undefined);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const requestClose = useCallback(() => {
    if (closeDisabled) return;
    onOpenChange?.(false);
    onClose?.();
  }, [closeDisabled, onClose, onOpenChange]);

  const resetDrag = useCallback(() => {
    dragStateRef.current = null;
    setDragging(false);
    setDragOffset(0);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const unlockScroll = lockDocumentScroll(document, window);

    window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? panelRef.current)?.focus();
    }, 0);

    return () => {
      unlockScroll();
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetDrag();
    }
  }, [open, resetDrag]);

  useEffect(() => {
    if (!open) return undefined;

    const preventBackgroundScroll = (event: WheelEvent | TouchEvent | PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && bodyRef.current?.contains(target)) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const listenerOptions: AddEventListenerOptions = {
      capture: true,
      passive: false,
    };

    document.addEventListener('wheel', preventBackgroundScroll, listenerOptions);
    document.addEventListener('touchmove', preventBackgroundScroll, listenerOptions);
    document.addEventListener('pointermove', preventBackgroundScroll, listenerOptions);

    return () => {
      document.removeEventListener('wheel', preventBackgroundScroll, listenerOptions);
      document.removeEventListener('touchmove', preventBackgroundScroll, listenerOptions);
      document.removeEventListener('pointermove', preventBackgroundScroll, listenerOptions);
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

  const handleDragPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (closeDisabled || !isMobileViewport() || isInteractiveDragTarget(event.target)) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    setDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }, [closeDisabled]);

  const handleDragPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = Math.max(0, event.clientY - dragState.startY);
    const elapsed = Math.max(1, event.timeStamp - dragState.lastTime);
    dragState.velocity = Math.max(0, (event.clientY - dragState.lastY) / elapsed);
    dragState.lastY = event.clientY;
    dragState.lastTime = event.timeStamp;
    setDragOffset(deltaY);
    event.preventDefault();
  }, []);

  const handleDragPointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const deltaY = Math.max(0, event.clientY - dragState.startY);
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const passedDistanceThreshold = deltaY >= Math.max(96, panelHeight * 0.24);
    const passedVelocityThreshold = deltaY >= 32 && dragState.velocity >= 0.55;

    resetDrag();

    if (!closeDisabled && (passedDistanceThreshold || passedVelocityThreshold)) {
      requestClose();
    }
  }, [closeDisabled, requestClose, resetDrag]);

  const handleDragPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    resetDrag();
  }, [resetDrag]);

  if (!open) return null;

  const desktopPlacement = desktopMode === 'panel'
    ? 'md:items-stretch md:justify-end md:p-0'
    : 'md:items-center md:justify-center md:p-4';
  const desktopShape = desktopMode === 'panel'
    ? 'md:h-full md:max-h-full md:rounded-none md:rounded-l-lg'
    : 'md:max-h-[86vh] md:rounded-lg';
  const allowBackdropClose = !closeDisabled && !preventBackdropClose;
  const bodySafeAreaClass = footer ? '' : 'pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4';

  const sheet = (
    <div className="fixed inset-0 z-50 h-dvh min-h-dvh w-screen w-dvw max-w-none overflow-hidden">
      <button
        type="button"
        aria-label={allowBackdropClose ? 'Close action surface' : 'Action surface backdrop'}
        className="absolute inset-0 h-full w-full touch-none bg-black/60 backdrop-blur-sm"
        onClick={allowBackdropClose ? requestClose : undefined}
        disabled={!allowBackdropClose}
        tabIndex={-1}
      />

      <div className={`pointer-events-none fixed inset-x-0 bottom-0 flex w-screen w-dvw max-w-none items-end md:inset-0 ${desktopPlacement}`}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-action-surface-state={state}
          className={[
            'theme-dropdown pointer-events-auto mx-0 flex max-h-[92dvh] w-screen w-dvw max-w-none min-w-0 flex-col overflow-hidden rounded-t-3xl rounded-b-none outline-none shadow-2xl transition-transform duration-200 ease-out md:w-full md:transition-none',
            sizeClasses[size],
            desktopShape,
            stateRingClasses[state],
            panelClassName,
          ].join(' ')}
          style={{
            transform: dragOffset > 0 ? `translate3d(0, ${dragOffset}px, 0)` : undefined,
            transition: dragging ? 'none' : undefined,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="shrink-0 touch-none border-b theme-border px-5 pb-4 pt-3 md:px-6 md:pt-5"
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerEnd}
            onPointerCancel={handleDragPointerCancel}
          >
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

          <div
            ref={bodyRef}
            className={`min-h-0 flex-1 overscroll-contain overflow-x-auto overflow-y-auto px-5 py-4 md:px-6 ${bodySafeAreaClass} ${bodyClassName}`}
            style={{ touchAction: 'pan-x pan-y' }}
          >
            {children}
          </div>

          {footer ? (
            <div className="sticky bottom-0 shrink-0 border-t theme-border bg-[color:var(--color-dropdown)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] md:px-6 md:pb-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(sheet, document.body) : sheet;
}

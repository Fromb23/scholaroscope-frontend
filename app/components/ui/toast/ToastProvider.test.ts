import { describe, expect, it } from 'vitest';
import { normalizeToast, toastReducer } from './ToastProvider';
import type { ToastMessage } from './toastTypes';

describe('ToastProvider queue', () => {
  it('queues and dismisses messages', () => {
    const first = normalizeToast({ id: 'first', message: 'Saved', severity: 'success' });
    const second = normalizeToast({ id: 'second', message: 'Could not sync', severity: 'warning' });

    const queued = toastReducer([], { type: 'enqueue', toast: first });
    const withSecond = toastReducer(queued, { type: 'enqueue', toast: second });
    const dismissed = toastReducer(withSecond, { type: 'dismiss', id: first.id });

    expect(withSecond.map((toast) => toast.message)).toEqual(['Saved', 'Could not sync']);
    expect(dismissed.map((toast) => toast.id)).toEqual(['second']);
  });

  it('keeps the stack bounded for mobile viewport safety', () => {
    const toasts = Array.from({ length: 6 }, (_, index) => (
      normalizeToast({ id: `toast-${index}`, message: `Message ${index}` })
    )).reduce<ToastMessage[]>(
      (state, toast) => toastReducer(state, { type: 'enqueue', toast }),
      [],
    );

    expect(toasts).toHaveLength(4);
    expect(toasts[0].id).toBe('toast-2');
  });

  it('supports persistent manual-dismiss messages', () => {
    const toast = normalizeToast({ id: 'manual', message: 'Review this', autoDismissMs: false });

    expect(toast.autoDismissMs).toBe(false);
  });
});

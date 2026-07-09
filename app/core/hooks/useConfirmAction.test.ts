import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactState = vi.hoisted(() => ({
  value: null as number | null,
  setValue: vi.fn((next: number | null) => {
    reactState.value = next;
  }),
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useState: () => [reactState.value, reactState.setValue],
}));

import { useConfirmAction } from './useConfirmAction';

describe('useConfirmAction', () => {
  beforeEach(() => {
    reactState.value = null;
    reactState.setValue.mockClear();
  });

  it('opens with a pending value when confirmation is requested', () => {
    const confirmation = useConfirmAction<number>();

    confirmation.requestConfirm(42);

    expect(reactState.setValue).toHaveBeenCalledWith(42);
  });

  it('returns and clears the pending value on confirm', () => {
    reactState.value = 42;
    const confirmation = useConfirmAction<number>();

    expect(confirmation.confirm()).toBe(42);
    expect(reactState.setValue).toHaveBeenCalledWith(null);
  });

  it('reports open state from the pending value', () => {
    reactState.value = 42;

    expect(useConfirmAction<number>().isOpen).toBe(true);
  });
});

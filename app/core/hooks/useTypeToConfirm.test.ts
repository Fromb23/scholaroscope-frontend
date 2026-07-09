import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactState = vi.hoisted(() => ({
  value: '',
  setValue: vi.fn((next: string) => {
    reactState.value = next;
  }),
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useState: () => [reactState.value, reactState.setValue],
}));

import { useTypeToConfirm } from './useTypeToConfirm';

describe('useTypeToConfirm', () => {
  beforeEach(() => {
    reactState.value = '';
    reactState.setValue.mockClear();
  });

  it('confirms trimmed input case-insensitively', () => {
    reactState.value = ' delete ';

    const confirmation = useTypeToConfirm('DELETE');

    expect(confirmation.isConfirmed).toBe(true);
  });

  it('resets the input', () => {
    const confirmation = useTypeToConfirm('DELETE');

    confirmation.reset();

    expect(reactState.setValue).toHaveBeenCalledWith('');
  });
});

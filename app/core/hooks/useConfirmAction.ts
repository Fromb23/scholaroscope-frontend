import { useCallback, useState } from 'react';

export function useConfirmAction<T = boolean>() {
  const [pending, setPending] = useState<T | null>(null);
  const requestConfirm = useCallback((value: T) => setPending(value), []);
  const confirm = useCallback(() => {
    const value = pending;
    setPending(null);
    return value;
  }, [pending]);
  const cancel = useCallback(() => setPending(null), []);
  const isOpen = pending !== null;

  return { pending, isOpen, requestConfirm, confirm, cancel };
}

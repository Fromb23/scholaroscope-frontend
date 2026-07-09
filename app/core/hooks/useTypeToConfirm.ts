import { useCallback, useState } from 'react';

export function useTypeToConfirm(expectedWord: string) {
  const [input, setInput] = useState('');
  const isConfirmed = input.trim().toLowerCase() === expectedWord.toLowerCase();
  const reset = useCallback(() => setInput(''), []);

  return { input, setInput, isConfirmed, reset };
}

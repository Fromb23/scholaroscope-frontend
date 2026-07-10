export function formatMoney(amount: string | number | null | undefined, currency = 'KES'): string {
  if (amount === null || typeof amount === 'undefined' || amount === '') {
    return `${currency} 0`;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${String(amount)}`;
  }

  const hasFraction = Math.abs(numericAmount % 1) > 0;
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(numericAmount);

  return `${currency} ${formatted}`;
}

export function isNetworkError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as { response?: unknown; code?: string };

    if (
      !axiosError.response
      && (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED')
    ) {
      return true;
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  return false;
}

export function isSafeNextPath(next: string | null | undefined): next is string {
  return !!next && next.startsWith('/') && !next.startsWith('//');
}

export function getCurrentPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function buildLoginPath(
  next: string | null | undefined,
  extras?: Record<string, string | null | undefined>
): string {
  const params = new URLSearchParams();
  if (isSafeNextPath(next) && !next.startsWith('/login')) {
    params.set('next', next);
  }
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
}

export function redirectToLogin(next: string = getCurrentPath()): void {
  if (typeof window === 'undefined') {
    return;
  }
  const loginPath = buildLoginPath(next);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== loginPath) {
    window.location.assign(loginPath);
  }
}

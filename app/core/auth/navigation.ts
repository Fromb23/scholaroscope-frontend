const MAX_APP_DESTINATION_LENGTH = 2048;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const DANGEROUS_SCHEME = /^(?:javascript|data|file|https?):/i;

function appOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
}

function decodeForSecurityInspection(value: string): string | null {
  let decoded = value;
  try {
    for (let depth = 0; depth < 3; depth += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function parseAppDestination(destination: string | null | undefined): string | null {
  if (!destination || destination.length > MAX_APP_DESTINATION_LENGTH) {
    return null;
  }
  if (
    CONTROL_CHARACTERS.test(destination)
    || destination.includes('\\')
    || !destination.startsWith('/')
    || destination.startsWith('//')
    || DANGEROUS_SCHEME.test(destination)
  ) {
    return null;
  }

  const decoded = decodeForSecurityInspection(destination);
  if (
    decoded === null
    || CONTROL_CHARACTERS.test(decoded)
    || decoded.includes('\\')
    || decoded.startsWith('//')
    || DANGEROUS_SCHEME.test(decoded)
  ) {
    return null;
  }

  try {
    const origin = appOrigin();
    const parsed = new URL(destination, origin);
    if (parsed.origin !== origin || parsed.username || parsed.password) {
      return null;
    }
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function sanitizeAppDestination(
  destination: string | null | undefined,
  fallback: string,
): string {
  return parseAppDestination(destination) ?? fallback;
}

export function isSafeNextPath(next: string | null | undefined): next is string {
  return parseAppDestination(next) !== null;
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
  const safeNext = parseAppDestination(next);
  if (safeNext && !safeNext.startsWith('/login')) {
    params.set('next', safeNext);
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

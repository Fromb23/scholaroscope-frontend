const EXPLICIT_LOGOUT_KEY = 'scholaroscope.explicit_logout';

let memoryTombstone = false;

function storage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

export function markExplicitLogout(): void {
  memoryTombstone = true;
  try {
    storage()?.setItem(EXPLICIT_LOGOUT_KEY, '1');
  } catch {
    // The in-memory tombstone still protects this document when storage is unavailable.
  }
}

export function clearExplicitLogout(): void {
  memoryTombstone = false;
  try {
    storage()?.removeItem(EXPLICIT_LOGOUT_KEY);
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

export function isExplicitLogoutActive(): boolean {
  if (memoryTombstone) {
    return true;
  }
  try {
    return storage()?.getItem(EXPLICIT_LOGOUT_KEY) === '1';
  } catch {
    return false;
  }
}

export class ExplicitLogoutActiveError extends Error {
  constructor() {
    super('Automatic authentication is disabled after explicit logout.');
    this.name = 'ExplicitLogoutActiveError';
  }
}

export function assertAutomaticAuthenticationAllowed(): void {
  if (isExplicitLogoutActive()) {
    throw new ExplicitLogoutActiveError();
  }
}

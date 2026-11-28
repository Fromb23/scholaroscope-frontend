export const LOGOUT_NAVIGATION_DEADLINE_MS = 1500;

export function replaceWithLoginDocument(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.replace('/login');
}

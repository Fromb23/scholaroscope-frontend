const SYSTEM_OWNED_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/get-started',
  '/workspaces/new',
] as const;

export function isSystemOwnedRoute(pathname: string | null): boolean {
  if (!pathname || pathname === '/') {
    return true;
  }

  return SYSTEM_OWNED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const SYSTEM_OWNED_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
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

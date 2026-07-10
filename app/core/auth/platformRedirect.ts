const DEFAULT_PLATFORM_APP_URL = 'https://admin.scholaroscope.com';

export function getPlatformAppUrl(path = '/login') {
  const base = process.env.NEXT_PUBLIC_PLATFORM_APP_URL || DEFAULT_PLATFORM_APP_URL;
  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function redirectToPlatformConsole(path = '/login') {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.assign(getPlatformAppUrl(path));
}

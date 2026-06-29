import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/components/layout/NotificationBell.tsx'),
  'utf8',
);

describe('NotificationBell responsive panel behavior', () => {
  it('uses mobile-safe fixed panel classes', () => {
    const bellSource = source();

    expect(bellSource).toContain('fixed left-3 right-3 top-16');
    expect(bellSource).toContain('max-h-[70vh]');
    expect(bellSource).toContain('max-h-[calc(70vh-4rem)] overflow-y-auto');
    expect(bellSource).toContain('break-words');
  });

  it('preserves desktop anchored dropdown behavior', () => {
    const bellSource = source();

    expect(bellSource).toContain('sm:absolute');
    expect(bellSource).toContain('sm:right-0');
    expect(bellSource).toContain('sm:mt-2');
    expect(bellSource).toContain('sm:w-80');
    expect(bellSource).toContain('sm:max-h-80');
  });

  it('keeps mark-all-read and notification navigation behavior', () => {
    const bellSource = source();

    expect(bellSource).toContain('await markAllRead()');
    expect(bellSource).toContain('await markRead([notification.id])');
    expect(bellSource).toContain('getNotificationRoute(notification)');
    expect(bellSource).toContain('setOpen(false)');
    expect(bellSource).toContain('router.push(route)');
  });
});

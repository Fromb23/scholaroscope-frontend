'use client';

export async function registerAnnouncementsPlugin(): Promise<void> {
  await import('./registry/navBadgeExtension');
  await import('./registry/navigationExtension');
  await import('./registry/routeAccessExtension');
}

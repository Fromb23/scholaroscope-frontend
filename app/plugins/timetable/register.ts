'use client';

export async function registerTimetablePlugin(): Promise<void> {
  await import('./registry/navigationExtension');
  await import('./registry/routeAccessExtension');
}

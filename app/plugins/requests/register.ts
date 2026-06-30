'use client';

export async function registerRequestsPlugin(): Promise<void> {
  await import('./registry/navigationExtension');
  await import('./registry/routeAccessExtension');
  await import('./registry/dashboardExtension');
  await import('./registry/profileExtension');
}

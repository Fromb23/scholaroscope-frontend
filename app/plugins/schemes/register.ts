'use client';

export async function registerSchemesPlugin(): Promise<void> {
  await import('./registry/navigationExtension');
  await import('./registry/pageIdentityExtension');
  await import('./registry/routeAccessExtension');
}

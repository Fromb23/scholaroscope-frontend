'use client';

export async function registerCambridgePlugin(): Promise<void> {
  await import('./registry/cohortSubjectPanelExtension');
  await import('./registry/cohortExtensions');
  await import('./registry/navigationExtension');
  await import('./registry/providerExtension');
  await import('./registry/routeAccessExtension');
  await import('./registry/routeExtension');
}

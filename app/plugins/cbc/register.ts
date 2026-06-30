'use client';

export async function registerCbcPlugin(): Promise<void> {
  await import('./registry/curriculumModalExtension');
  await import('./registry/assessmentPolicyPreviewExtension');
  await import('./registry/cohortSubjectPanelExtension');
  await import('./registry/navigationExtension');
  await import('./registry/providerExtension');
  await import('./registry/routeAccessExtension');
  await import('./registry/teachingRouteExtension');
  await import('./registry/fineArtsPracticalExtensions');
  await import('./registry/practicalExtensions');
  await import('./registry/learnerExtension');
}

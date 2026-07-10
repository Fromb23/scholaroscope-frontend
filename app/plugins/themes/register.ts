'use client';

export async function registerThemesPlugin() {
  await import('./registry/settingsExtension');
}

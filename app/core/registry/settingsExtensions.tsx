'use client';

import { Fragment, type ReactNode } from 'react';

export type SettingsExtensionSlot =
  | 'admin.settings.appearance'
  | 'superadmin.settings.appearance';

export type SettingsExtension = {
  key: string;
  slot: SettingsExtensionSlot;
  priority?: number;
  render: () => ReactNode;
};

const settingsExtensions = new Map<string, SettingsExtension>();

export function registerSettingsExtension(extension: SettingsExtension) {
  const key = `${extension.slot}:${extension.key}`;
  settingsExtensions.set(key, extension);
}

export function getSettingsExtensions(slot: SettingsExtensionSlot): SettingsExtension[] {
  return Array.from(settingsExtensions.values())
    .filter((extension) => extension.slot === slot)
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100));
}

export function renderSettingsExtensions(slot: SettingsExtensionSlot): ReactNode {
  return getSettingsExtensions(slot).map((extension) => (
    <Fragment key={`${extension.slot}:${extension.key}`}>
      {extension.render()}
    </Fragment>
  ));
}

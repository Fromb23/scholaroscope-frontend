'use client';

import { registerSettingsExtension } from '@/app/core/registry/settingsExtensions';
import { ThemeSettingsCard } from '../components/ThemeSettingsCard';

registerSettingsExtension({
  key: 'themes.organization-branding',
  slot: 'admin.settings.appearance',
  priority: 10,
  render: () => <ThemeSettingsCard />,
});

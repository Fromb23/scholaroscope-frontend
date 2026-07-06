import type { MetadataRoute } from 'next';
import { DEFAULT_THEME_TOKENS } from '@/app/core/theme/effectiveTheme';

const DEFAULT_BRAND_COLOR = DEFAULT_THEME_TOKENS.brandPrimary;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scholaroscope',
    short_name: 'Scholaroscope',
    description:
      'Operator console for school operations, teaching workflows, assessments, learners, and reporting.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: DEFAULT_BRAND_COLOR,
    theme_color: DEFAULT_BRAND_COLOR,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

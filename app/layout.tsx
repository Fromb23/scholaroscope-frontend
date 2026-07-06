// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/app/context/AuthContext';
import { EffectiveThemeProvider } from '@/app/context/EffectiveThemeContext';
import { ThemeProvider } from '@/app/context/ThemeContext';
import { ToastProvider } from '@/app/components/ui/toast/ToastProvider';
import { ServiceWorkerRegistrar } from '@/app/components/pwa/ServiceWorkerRegistrar';
import { DEFAULT_THEME_TOKENS } from '@/app/core/theme/effectiveTheme';
import '@/app/globals.css';
import Providers from './providers';

const DEFAULT_BRAND_COLOR = DEFAULT_THEME_TOKENS.brandPrimary;

export const metadata: Metadata = {
  applicationName: 'Scholaroscope',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Scholaroscope',
  },
  icons: {
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: DEFAULT_BRAND_COLOR,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeProvider>
            <ToastProvider>
              <ServiceWorkerRegistrar />
              <AuthProvider>
                <EffectiveThemeProvider>{children}</EffectiveThemeProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

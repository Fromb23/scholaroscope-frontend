// app/layout.tsx
import type { Viewport } from 'next';
import { AuthProvider } from '@/app/context/AuthContext';
import { EffectiveThemeProvider } from '@/app/context/EffectiveThemeContext';
import { ThemeProvider } from '@/app/context/ThemeContext';
import { ToastProvider } from '@/app/components/ui/toast/ToastProvider';
import '@/app/globals.css';
import Providers from './providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeProvider>
            <ToastProvider>
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

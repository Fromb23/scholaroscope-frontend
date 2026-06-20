// app/layout.tsx
import { AuthProvider } from '@/app/context/AuthContext';
import { EffectiveThemeProvider } from '@/app/context/EffectiveThemeContext';
import { ThemeProvider } from '@/app/context/ThemeContext';
import '@/app/globals.css';
import Providers from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeProvider>
            <AuthProvider>
              <EffectiveThemeProvider>{children}</EffectiveThemeProvider>
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

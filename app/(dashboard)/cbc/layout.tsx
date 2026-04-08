// app/(dashboard)/cbc/layout.tsx
import { CBCProvider } from '@/app/plugins/cbc/context/CBCContext';
import '@/app/plugins/cbc/registry/learnerExtension';

export default function CBCLayout({ children }: { children: React.ReactNode }) {
    return (
        <CBCProvider>
            <div className="max-w-7xl mx-auto space-y-6">
                {children}
            </div>
        </CBCProvider>
    );
}
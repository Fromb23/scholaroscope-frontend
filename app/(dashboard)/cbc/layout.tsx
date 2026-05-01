'use client';

import '@/app/plugins/cbc/registry/learnerExtension';
import { CurriculumAccessGuard } from '@/app/core/guards/CurriculumAccessGuard';
import { CBCProvider } from '@/app/plugins/cbc/context/CBCContext';

export default function CBCLayout({ children }: { children: React.ReactNode }) {
    return (
        <CurriculumAccessGuard curriculum="CBC">
            <CBCProvider>
                <div className="max-w-7xl mx-auto space-y-6">{children}</div>
            </CBCProvider>
        </CurriculumAccessGuard>
    );
}

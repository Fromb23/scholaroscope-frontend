'use client';

import { CurriculumAccessGuard } from '@/app/core/guards/CurriculumAccessGuard';

export default function CambridgeLayout({ children }: { children: React.ReactNode }) {
    return (
        <CurriculumAccessGuard curriculum="CAMBRIDGE">
            <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </CurriculumAccessGuard>
    );
}

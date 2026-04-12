// app/core/components/DesktopOnly.tsx
import { ReactNode } from 'react';

interface DesktopOnlyProps {
    children: ReactNode;
    className?: string;
}

/**
 * Hides noisy stat-heavy sections on mobile.
 * Wrap any <StatsCard> grid or analytics block with this.
 * Renders nothing below `md` breakpoint (768px).
 */
export function DesktopOnly({ children, className = '' }: DesktopOnlyProps) {
    return (
        <div className={`hidden md:block ${className}`.trim()}>
            {children}
        </div>
    );
}
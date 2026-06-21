import type { ReactNode } from 'react';

export function ReportPageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] space-y-4 lg:space-y-5 ${className}`}>{children}</div>;
}

export function CompactReportGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-3 ${className}`}>{children}</div>;
}

export function CompactStatsGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>{children}</div>;
}

export function ReportSplitLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 xl:grid-cols-[minmax(260px,360px)_1fr] ${className}`}>{children}</div>;
}

export function shouldUseSplitReportLayout(leftItemCount: number, rightHasContent: boolean): boolean {
  return leftItemCount > 0 && rightHasContent;
}

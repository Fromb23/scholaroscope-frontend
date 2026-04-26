'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface CambridgeBreadcrumbSegment {
  label: string;
  href?: string;
}

const CAMBRIDGE_NAV_ITEMS = [
  { href: '/cambridge', label: 'Dashboard' },
  { href: '/cambridge/setup', label: 'Setup' },
  { href: '/cambridge/authoring/programmes', label: 'Authoring' },
  { href: '/cambridge/progress', label: 'Progress' },
] as const;

export function CambridgeWorkflowNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
      {CAMBRIDGE_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-blue-600 font-medium text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CambridgeBreadcrumb({ segments }: { segments: CambridgeBreadcrumbSegment[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
      {segments.map((segment, index) => (
        <span key={`${segment.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? <span className="text-gray-300">/</span> : null}
          {segment.href ? (
            <Link href={segment.href} className="transition-colors hover:text-blue-600">
              {segment.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900">{segment.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

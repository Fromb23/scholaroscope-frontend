'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface CambridgeBreadcrumbSegment {
  label: string;
  href?: string;
}

type CambridgeNavSection = 'dashboard' | 'authoring' | 'setup' | 'subjects' | 'progress';

const CAMBRIDGE_NAV_ITEMS: Array<{ href: string; label: string; section: CambridgeNavSection }> = [
  { href: '/cambridge', label: 'Dashboard', section: 'dashboard' },
  { href: '/cambridge/authoring/programmes', label: 'Authoring', section: 'authoring' },
  { href: '/cambridge/setup', label: 'Setup', section: 'setup' },
  { href: '/cambridge/subjects', label: 'Subjects', section: 'subjects' },
  { href: '/cambridge/progress', label: 'Progress', section: 'progress' },
] as const;

function activeSectionForPath(pathname: string): CambridgeNavSection | null {
  if (pathname === '/cambridge' || pathname === '/cambridge/dashboard') {
    return 'dashboard';
  }
  if (pathname.startsWith('/cambridge/authoring')) {
    return 'authoring';
  }
  if (
    pathname.startsWith('/cambridge/setup') ||
    pathname.startsWith('/cambridge/programmes') ||
    pathname.startsWith('/cambridge/frameworks') ||
    pathname.startsWith('/cambridge/syllabuses')
  ) {
    return 'setup';
  }
  if (pathname.startsWith('/cambridge/subjects') || pathname.startsWith('/cambridge/offerings')) {
    return 'subjects';
  }
  if (pathname.startsWith('/cambridge/progress')) {
    return 'progress';
  }
  return null;
}

export function CambridgeWorkflowNav() {
  const pathname = usePathname();
  const activeSection = activeSectionForPath(pathname);

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2">
      {CAMBRIDGE_NAV_ITEMS.map((item) => {
        const active = activeSection === item.section;
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

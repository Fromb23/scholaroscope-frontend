'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useSidebar } from '@/app/context/SidebarContext';
import {
  isNavHrefActive,
  type NavItem,
  type NavigationConfig,
} from './navConfig';

interface MobileBottomNavProps {
  navConfig: NavigationConfig;
}

function activeTabHref(pathname: string, tabs: NavItem[]): string | null {
  return tabs.reduce<string | null>((activeHref, item) => {
    if (!isNavHrefActive(pathname, item.href)) return activeHref;
    const itemPath = item.href.split('?')[0];
    const activePath = activeHref?.split('?')[0] ?? '';
    return itemPath.length > activePath.length ? item.href : activeHref;
  }, null);
}

export default function MobileBottomNav({ navConfig }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { openSidebar } = useSidebar();
  const tabs = navConfig.primary.slice(0, 4);
  const activeHref = activeTabHref(pathname, tabs);

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t theme-border theme-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="flex items-stretch gap-1 px-2 py-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`theme-focus-ring flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center text-[11px] font-medium leading-tight transition-colors ${
                active ? 'theme-nav-active' : 'theme-muted theme-nav-hover'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate px-1">{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openSidebar}
          className="theme-focus-ring theme-muted theme-nav-hover flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center text-[11px] font-medium leading-tight transition-colors"
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full truncate px-1">More</span>
        </button>
      </div>
    </nav>
  );
}

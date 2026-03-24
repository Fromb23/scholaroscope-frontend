'use client';

// ============================================================================
// app/core/components/layout/NavItem.tsx
//
// Single nav item — handles leaf links and parent items with children.
// No any. Typed props.
// ============================================================================

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { NavItem as NavItemType, RoleColorScheme } from './navConfig';

interface NavItemProps {
    item: NavItemType;
    isActive: (href: string) => boolean;
    isExpanded: boolean;
    onToggle: (name: string) => void;
    onNavigate: () => void;
    colors: RoleColorScheme;
}

function isParentActive(item: NavItemType, isActive: (href: string) => boolean): boolean {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) ?? false;
}

export function NavItem({
    item, isActive, isExpanded, onToggle, onNavigate, colors,
}: NavItemProps) {
    const hasChildren = (item.children?.length ?? 0) > 0;
    const parentActive = isParentActive(item, isActive);
    const Icon = item.icon;

    if (hasChildren) {
        return (
            <li className="mb-1">
                <button
                    onClick={() => onToggle(item.name)}
                    className={`w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${parentActive ? colors.active : `text-gray-700 ${colors.hover}`
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {item.badge !== undefined && item.badge > 0 && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                {item.badge}
                            </span>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`} />
                    </div>
                </button>

                {isExpanded && (
                    <ul className="mt-2 ml-4 space-y-1">
                        {item.children!.map(child => {
                            const ChildIcon = child.icon;
                            const childActive = isActive(child.href);
                            return (
                                <li key={child.name}>
                                    <Link
                                        href={child.href}
                                        onClick={onNavigate}
                                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${childActive
                                            ? colors.childActive
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <ChildIcon className="h-4 w-4 shrink-0" />
                                        <span>{child.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </li>
        );
    }

    return (
        <li className="mb-1">
            <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${parentActive ? colors.active : `text-gray-700 ${colors.hover}`
                    }`}
            >
                <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {item.badge}
                    </span>
                )}
            </Link>
        </li>
    );
}
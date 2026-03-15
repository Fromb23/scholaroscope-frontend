// ============================================================================
// components/dashboard/QuickActions.tsx - Quick Action Buttons
// ============================================================================

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface QuickAction {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {actions.map((action) => (
                <Link
                    key={action.title}
                    href={action.href}
                    className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md"
                >
                    <div className={`mb-4 inline-flex rounded-lg ${action.color} p-3`}>
                        <action.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{action.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{action.description}</p>
                </Link>
            ))}
        </div>
    );
}

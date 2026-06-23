
// FILE: app/(dashboard)/admin/alerts/page.tsx
// ============================================================================
'use client';

import { AlertCircle, Bell, TrendingDown } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';

export function SystemAlertsPage() {
    const alertCards = [
        {
            label: 'Critical Alerts',
            count: 3,
            icon: AlertCircle,
            iconClassName: 'text-red-600',
            wrapperClassName: 'theme-danger-surface',
            badgeVariant: 'red' as const,
        },
        {
            label: 'Warnings',
            count: 8,
            icon: TrendingDown,
            iconClassName: 'text-yellow-600',
            wrapperClassName: 'theme-warning-surface',
            badgeVariant: 'yellow' as const,
        },
        {
            label: 'Info',
            count: 12,
            icon: Bell,
            iconClassName: 'text-blue-600',
            wrapperClassName: 'theme-info-surface',
            badgeVariant: 'blue' as const,
        },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold theme-text">
                    <Bell className="h-8 w-8 text-[color:var(--color-warning)]" />
                    System Alerts
                </h1>
                <p className="mt-2 theme-muted">Monitor important system notifications and warnings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {alertCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <Card key={card.label} className={`${card.wrapperClassName} p-6`}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <Badge variant={card.badgeVariant} size="sm">
                                        {card.label}
                                    </Badge>
                                    <p className="mt-4 text-3xl font-bold theme-text">{card.count}</p>
                                </div>
                                <div className="theme-surface-elevated rounded-xl border p-3 theme-border">
                                    <Icon className={`h-8 w-8 ${card.iconClassName}`} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card className="theme-surface-elevated p-12 text-center">
                <div className="theme-info-surface mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
                    <Bell className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold theme-text">Alert System Coming Soon</h3>
                <p className="mx-auto max-w-2xl theme-muted">
                    Comprehensive alert management including attendance anomalies, grade policy violations,
                    system issues, and custom notification rules.
                </p>
            </Card>
        </div>
    );
}

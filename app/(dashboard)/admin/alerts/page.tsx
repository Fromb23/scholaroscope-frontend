
// FILE: app/(dashboard)/admin/alerts/page.tsx
// ============================================================================
'use client';

import { AlertCircle, Bell, TrendingDown, UserX } from 'lucide-react';

export default function SystemAlertsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Bell className="w-8 h-8 text-orange-600" />
                    System Alerts
                </h1>
                <p className="text-gray-600 mt-2">Monitor important system notifications and warnings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                    <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Critical Alerts</h3>
                    <p className="text-3xl font-bold text-red-600">3</p>
                </div>

                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                    <TrendingDown className="w-8 h-8 text-yellow-600 mb-3" />
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Warnings</h3>
                    <p className="text-3xl font-bold text-yellow-600">8</p>
                </div>

                <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                    <Bell className="w-8 h-8 text-blue-600 mb-3" />
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Info</h3>
                    <p className="text-3xl font-bold text-blue-600">12</p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-12 border border-blue-200 text-center">
                <Bell className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Alert System Coming Soon</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Comprehensive alert management including attendance anomalies, grade policy violations,
                    system issues, and custom notification rules.
                </p>
            </div>
        </div>
    );
}


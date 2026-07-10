// FILE: app/(dashboard) / superadmin / subscriptions / page.tsx
// ============================================================================
'use client';

import { CalendarClock, Package, Puzzle, ShieldCheck } from 'lucide-react';

export function SubscriptionsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <CalendarClock className="w-8 h-8 text-green-600" />
                    Subscriptions
                </h1>
                <p className="text-gray-600 mt-2">Manage deterministic workspace subscription periods</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <CalendarClock className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-medium text-gray-600">Period Length</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">3 months</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-medium text-gray-600">Base Plan</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">Standard</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Puzzle className="w-5 h-5 text-purple-600" />
                        <h3 className="text-sm font-medium text-gray-600">Premium Model</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">Per plugin</p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
                <ShieldCheck className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Policy foundation active</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Workspace periods, immutable snapshots, premium plugin composition, and the
                    new-term renewal gate are managed from each organization detail page.
                </p>
            </div>
        </div>
    );
}

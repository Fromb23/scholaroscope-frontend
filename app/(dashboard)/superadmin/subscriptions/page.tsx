// FILE: app/(dashboard) / superadmin / subscriptions / page.tsx
// ============================================================================
'use client';

import { DollarSign, TrendingUp, CreditCard, Package } from 'lucide-react';

export default function SubscriptionsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    Subscriptions & Billing
                </h1>
                <p className="text-gray-600 mt-2">Manage platform subscriptions and revenue</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-medium text-gray-600">Monthly Revenue</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">$45,200</p>
                    <p className="text-sm text-green-600 mt-1">+12.4% from last month</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-medium text-gray-600">Active Plans</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">38</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                        <h3 className="text-sm font-medium text-gray-600">Trial Plans</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">12</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        <h3 className="text-sm font-medium text-gray-600">Churn Rate</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">2.1%</p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-12 border border-purple-200 text-center">
                <DollarSign className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Subscription Management Coming Soon</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Complete billing system including plan management, invoicing, payment processing,
                    subscription upgrades/downgrades, and revenue analytics.
                </p>
            </div>
        </div>
    );
}
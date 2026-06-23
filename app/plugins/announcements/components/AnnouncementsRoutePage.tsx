'use client';

import Link from 'next/link';
import { MegaphoneOff } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useAuth } from '@/app/context/AuthContext';
import { AnnouncementsPage } from '@/app/plugins/announcements/components/AnnouncementsPage';

export default function Page() {
    const { activeOrg, capabilities } = useAuth();
    const isFreelance = activeOrg?.org_type === 'PERSONAL'
        || capabilities.workspace_behavior === 'FREELANCE_TEACHER';

    if (isFreelance) {
        return (
            <div className="mx-auto max-w-xl">
                <Card className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <MegaphoneOff className="h-6 w-6 text-gray-500" />
                    </div>
                    <h1 className="text-xl font-semibold theme-text">Announcements are not available</h1>
                    <p className="mt-2 text-sm theme-muted">
                        My teaching workspace is a single-teacher workspace, so team announcements are disabled.
                    </p>
                    <Link href="/dashboard/admin" className="mt-5 inline-flex">
                        <Button variant="secondary">Back to my teaching workspace</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return <AnnouncementsPage />;
}

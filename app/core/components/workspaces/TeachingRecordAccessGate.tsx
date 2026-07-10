'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, BarChart3, Users } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useAuth } from '@/app/context/AuthContext';
import { canCreateTeachingRecord, isSupervisionOnlyAdmin } from '@/app/core/lib/workspaces';

interface TeachingRecordAccessGateProps {
  children: ReactNode;
  backHref: string;
  backLabel: string;
  title: string;
}

export function TeachingRecordAccessGate({
  children,
  backHref,
  backLabel,
  title,
}: TeachingRecordAccessGateProps) {
  const { activeOrg, activeRole, capabilities } = useAuth();
  const teachingAccess = canCreateTeachingRecord({
    role: activeRole,
    orgType: activeOrg?.org_type,
    isSuperadmin: false,
    capabilities,
  });
  const supervisionOnlyAdmin = isSupervisionOnlyAdmin({
    role: activeRole,
    orgType: activeOrg?.org_type,
    isSuperadmin: false,
    capabilities,
  });

  if (!supervisionOnlyAdmin || teachingAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">Teaching record creation is instructor-managed in this workspace.</p>
        </div>
      </div>

      <Card>
        <div className="space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">
              Admins supervise and manage this workspace. Teaching records are created by assigned instructors.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={backHref}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
            <Link href="/admin/instructors">
              <Button variant="secondary">
                <Users className="mr-2 h-4 w-4" />
                Instructor Management
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="secondary">
                <BarChart3 className="mr-2 h-4 w-4" />
                Open Reports
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

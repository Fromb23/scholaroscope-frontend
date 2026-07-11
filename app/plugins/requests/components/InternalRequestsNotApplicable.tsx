'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';

export function InternalRequestsNotApplicable() {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Inbox className="h-6 w-6 text-gray-500" />
        </div>
        <h1 className="text-xl font-semibold theme-text">Internal requests are not available</h1>
        <p className="mt-2 text-sm theme-muted">
          This workspace does not use instructor-to-admin approval workflows.
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}

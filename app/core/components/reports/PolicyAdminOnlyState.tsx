'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';

interface PolicyAdminOnlyStateProps {
    title: string;
}

export function PolicyAdminOnlyState({ title }: PolicyAdminOnlyStateProps) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                <p className="mt-1 text-gray-500">
                    Policy authoring is managed by administrators.
                </p>
            </div>

            <Card className="max-w-3xl">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div className="space-y-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Administrator access required
                            </h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Instructors can review resolved policy context inside assessment pages,
                                but policy authoring and policy lists are restricted to administrators.
                            </p>
                        </div>

                        <Link href="/assessments">
                            <Button variant="secondary">Back to Assessments</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}

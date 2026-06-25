'use client';

import Link from 'next/link';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
    getAcademicSetupNextActionDisplayLabel,
    getAcademicSetupPageState,
    withAcademicSetupMode,
} from '@/app/core/lib/academicSetup';
import type { AcademicSetupStatus, AcademicSetupStepKey } from '@/app/core/types/academic';

export function AcademicSetupGate({
    status,
    stepKey,
    setupMode,
    blockedNotice = false,
}: {
    status: AcademicSetupStatus | null | undefined;
    stepKey: AcademicSetupStepKey;
    setupMode: boolean;
    blockedNotice?: boolean;
}) {
    if (!setupMode || !status || status.complete) {
        return null;
    }

    const pageState = getAcademicSetupPageState(status, stepKey);

    if (pageState === 'blocked') {
        return (
            <Card>
                <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold theme-text">Academic setup gate</h2>
                        <Badge variant="orange">Blocked</Badge>
                    </div>
                    <p className="text-sm theme-muted">
                        Complete academic setup before using this workspace operationally.
                    </p>
                    <Link href={withAcademicSetupMode(status.next_action.href)}>
                        <Button>{getAcademicSetupNextActionDisplayLabel(status)}</Button>
                    </Link>
                </div>
            </Card>
        );
    }

    if (pageState === 'completed') {
        return (
            <Card>
                <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold theme-text">Setup step complete</h2>
                        <Badge variant="green">Complete</Badge>
                    </div>
                    <p className="text-sm theme-muted">
                        This step is complete. You can review or adjust it, then continue setup.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link href={withAcademicSetupMode('/academic')}>
                            <Button type="button" variant="secondary">Back to setup overview</Button>
                        </Link>
                        <Link href={withAcademicSetupMode(status.next_action.href)}>
                            <Button>{getAcademicSetupNextActionDisplayLabel(status)}</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        );
    }

    if (blockedNotice || pageState === 'current') {
        return (
            <Card>
                <div className="space-y-2 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold theme-text">Current setup step</h2>
                        <Badge variant="blue">Current</Badge>
                    </div>
                    <p className="text-sm theme-muted">
                        {status.current_step_description}
                    </p>
                </div>
            </Card>
        );
    }

    return null;
}

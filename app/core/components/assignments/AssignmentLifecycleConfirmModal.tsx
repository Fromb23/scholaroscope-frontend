'use client';

import Modal from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';

export function AssignmentLifecycleConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    confirmPendingLabel,
    blockingItems = [],
    warnings = [],
    pending = false,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    message: string;
    confirmLabel: string;
    confirmPendingLabel: string;
    blockingItems?: string[];
    warnings?: string[];
    pending?: boolean;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <div className="space-y-5">
                <p className="text-sm leading-6 theme-muted">{message}</p>

                {blockingItems.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="text-sm font-medium text-amber-900">Needs attention</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                            {blockingItems.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {warnings.length > 0 ? (
                    <div className="space-y-2 rounded-lg border theme-border theme-surface-muted px-4 py-3">
                        <div className="text-sm font-medium theme-text">Notes</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm theme-muted">
                            {warnings.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={() => void onConfirm()} disabled={pending}>
                        {pending ? confirmPendingLabel : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

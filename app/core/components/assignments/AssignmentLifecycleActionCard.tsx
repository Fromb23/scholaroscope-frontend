'use client';

import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type {
    AssignmentDeliveryMode,
    AssignmentLifecycleAction,
    AssignmentLifecycleState,
} from '@/app/core/types/assignments';

const ACTION_LABELS: Record<AssignmentLifecycleAction, string> = {
    EDIT_ASSIGNMENT: 'Edit preparation',
    ISSUE_ASSIGNMENT: 'Issue assignment',
    DELETE_DRAFT: 'Delete draft',
    MANAGE_GROUPS: 'Manage groups',
    ADD_LEARNERS: 'Add learners',
    RECORD_SUBMISSION: 'Record submission',
    MARK_PARTICIPATION: 'Mark participation',
    FINISH_LEARNER_WORK: 'Finish learner work',
    REVIEW_WORK: 'Review work',
    RECORD_EVIDENCE: 'Record evidence',
    REOPEN_LEARNER_WORK: 'Reopen learner work',
    STORE_RECORD: 'Store assignment record',
    VIEW_RECORD: 'View record',
    RESTORE_TO_REVIEW: 'Restore to review',
};

const ACTION_PENDING_LABELS: Partial<Record<AssignmentLifecycleAction, string>> = {
    FINISH_LEARNER_WORK: 'Finishing learner work...',
    STORE_RECORD: 'Storing record...',
    REOPEN_LEARNER_WORK: 'Reopening learner work...',
    RESTORE_TO_REVIEW: 'Restoring to review...',
    DELETE_DRAFT: 'Deleting draft...',
};

const ACTION_ORDER: AssignmentLifecycleAction[] = [
    'ISSUE_ASSIGNMENT',
    'EDIT_ASSIGNMENT',
    'DELETE_DRAFT',
    'MANAGE_GROUPS',
    'ADD_LEARNERS',
    'RECORD_SUBMISSION',
    'REVIEW_WORK',
    'MARK_PARTICIPATION',
    'RECORD_EVIDENCE',
    'FINISH_LEARNER_WORK',
    'STORE_RECORD',
    'REOPEN_LEARNER_WORK',
    'VIEW_RECORD',
    'RESTORE_TO_REVIEW',
];

function getActionButtonVariant(action: AssignmentLifecycleAction): 'primary' | 'secondary' | 'danger' | 'ghost' {
    if (action === 'DELETE_DRAFT') {
        return 'danger';
    }
    return 'secondary';
}

function getStageCopy(stage: AssignmentLifecycleState['stage'], deliveryMode: AssignmentDeliveryMode) {
    switch (stage) {
        case 'PREPARING':
            return {
                title: 'Prepare assignment',
                description: 'This assignment is not issued yet.',
            };
        case 'ISSUED':
            return {
                title: 'Manage issued work',
                description: deliveryMode === 'GROUP'
                    ? 'Groups are working on this assignment.'
                    : 'Learners are working on this assignment.',
            };
        case 'REVIEWING':
            return {
                title: 'Review assignment',
                description: deliveryMode === 'GROUP'
                    ? 'Learner work is closed. Review group work, mark participation, and record evidence.'
                    : 'Learner work is closed. Review work and record evidence before storing the record.',
            };
        case 'STORED':
            return {
                title: 'Stored for records',
                description: 'This assignment is stored and no longer part of the daily workflow.',
            };
        default:
            return {
                title: 'Assignment workflow',
                description: '',
            };
    }
}

export function AssignmentLifecycleActionCard({
    lifecycleState,
    deliveryMode,
    onAction,
    pendingAction = null,
    disabled = false,
}: {
    lifecycleState: AssignmentLifecycleState;
    deliveryMode: AssignmentDeliveryMode;
    onAction: (action: AssignmentLifecycleAction) => void;
    pendingAction?: AssignmentLifecycleAction | null;
    disabled?: boolean;
}) {
    const stageCopy = getStageCopy(lifecycleState.stage, deliveryMode);
    const primaryAction = lifecycleState.next_action === 'NONE'
        ? null
        : lifecycleState.next_action;
    const secondaryActions = ACTION_ORDER.filter((action) => (
        lifecycleState.allowed_actions.includes(action)
        && action !== primaryAction
    ));

    return (
        <Card className="space-y-5">
            <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide theme-subtle">
                    Current action
                </div>
                <div>
                    <h2 className="text-xl font-semibold theme-text">{stageCopy.title}</h2>
                    <p className="mt-1 text-sm theme-muted">{stageCopy.description}</p>
                </div>
                <p className="text-sm theme-muted">
                    <span className="font-medium theme-text">Next:</span>{' '}
                    {lifecycleState.next_action_label}. {lifecycleState.next_action_description}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {primaryAction ? (
                    <Button
                        type="button"
                        onClick={() => onAction(primaryAction)}
                        disabled={disabled}
                        variant="primary"
                    >
                        {pendingAction === primaryAction
                            ? ACTION_PENDING_LABELS[primaryAction] ?? ACTION_LABELS[primaryAction]
                            : lifecycleState.next_action_label}
                    </Button>
                ) : null}

                {secondaryActions.map((action) => (
                    <Button
                        key={action}
                        type="button"
                        variant={getActionButtonVariant(action)}
                        onClick={() => onAction(action)}
                        disabled={disabled}
                    >
                        {pendingAction === action
                            ? ACTION_PENDING_LABELS[action] ?? ACTION_LABELS[action]
                            : ACTION_LABELS[action]}
                    </Button>
                ))}
            </div>

            {lifecycleState.blocking_items.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-sm font-medium text-amber-900">Needs attention</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                        {lifecycleState.blocking_items.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {lifecycleState.warnings.length > 0 ? (
                <div className="space-y-2 rounded-lg border theme-border theme-surface-muted px-4 py-3">
                    <div className="text-sm font-medium theme-text">Notes</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm theme-muted">
                        {lifecycleState.warnings.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </Card>
    );
}

'use client';

import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AssignmentProgressTracker } from '@/app/core/components/assignments/AssignmentProgressTracker';
import type {
    AssignmentDeliveryMode,
    AssignmentLifecycleAction,
    AssignmentLifecycleState,
} from '@/app/core/types/assignments';

const ACTION_LABELS: Record<AssignmentLifecycleAction, string> = {
    EDIT_ASSIGNMENT: 'Edit preparation',
    ISSUE_ASSIGNMENT: 'Issue assignment',
    DELETE_DRAFT: 'Delete draft',
    MANAGE_GROUPS: 'Set up groups',
    ADD_LEARNERS: 'Add learners',
    RECORD_SUBMISSION: 'Record learner response',
    MARK_PARTICIPATION: 'Update participation',
    FINISH_LEARNER_WORK: 'Close learner work',
    REVIEW_WORK: 'Review learner work',
    RECORD_EVIDENCE: 'Review evidence status',
    REOPEN_LEARNER_WORK: 'Reopen learner work',
    STORE_RECORD: 'Store assignment record',
    VIEW_RECORD: 'View record',
    RESTORE_TO_REVIEW: 'Restore to review',
    RESTORE_EVIDENCE: 'Restore submitted evidence',
    DELETE_ASSIGNMENT: 'Delete assignment',
};

const ACTION_PENDING_LABELS: Partial<Record<AssignmentLifecycleAction, string>> = {
    FINISH_LEARNER_WORK: 'Closing learner work...',
    STORE_RECORD: 'Storing record...',
    REOPEN_LEARNER_WORK: 'Reopening learner work...',
    RESTORE_TO_REVIEW: 'Restoring to review...',
    DELETE_DRAFT: 'Deleting draft...',
    RESTORE_EVIDENCE: 'Restoring evidence...',
    DELETE_ASSIGNMENT: 'Deleting assignment...',
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
    'RESTORE_EVIDENCE',
    'DELETE_ASSIGNMENT',
];

function getActionLabel(
    action: AssignmentLifecycleAction,
    deliveryMode: AssignmentDeliveryMode,
): string {
    if (action === 'RECORD_SUBMISSION') {
        return deliveryMode === 'GROUP' ? 'Record group response' : 'Record learner response';
    }

    if (action === 'REVIEW_WORK') {
        return deliveryMode === 'GROUP' ? 'Review group work' : 'Review learner work';
    }

    return ACTION_LABELS[action];
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
                    ? 'Learner work is closed. Review group work and participation; evidence is created automatically after review.'
                    : 'Learner work is closed. Review work; evidence is created automatically before the record is stored.',
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
    supplementaryActions = [],
}: {
    lifecycleState: AssignmentLifecycleState;
    deliveryMode: AssignmentDeliveryMode;
    onAction: (action: AssignmentLifecycleAction) => void;
    pendingAction?: AssignmentLifecycleAction | null;
    disabled?: boolean;
    supplementaryActions?: Array<{
        key: string;
        label: string;
        href: string;
    }>;
}) {
    const stageCopy = getStageCopy(lifecycleState.stage, deliveryMode);
    const primaryAction = lifecycleState.next_action === 'NONE'
        ? null
        : lifecycleState.next_action;
    const secondaryActions = ACTION_ORDER.filter((action) => (
        lifecycleState.allowed_actions.includes(action)
        && action !== primaryAction
    ));
    const moreActions: ActionMenuItem[] = [
        ...secondaryActions.map((action) => ({
            label: pendingAction === action
                ? ACTION_PENDING_LABELS[action] ?? getActionLabel(action, deliveryMode)
                : getActionLabel(action, deliveryMode),
            onSelect: () => onAction(action),
            disabled,
            destructive: action === 'DELETE_DRAFT' || action === 'DELETE_ASSIGNMENT',
        })),
        ...supplementaryActions.map((action) => ({
            label: action.label,
            href: action.href,
        })),
    ];

    return (
        <Card className="space-y-5">
            <AssignmentProgressTracker lifecycleState={lifecycleState} />

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
                            ? ACTION_PENDING_LABELS[primaryAction] ?? getActionLabel(primaryAction, deliveryMode)
                            : lifecycleState.next_action_label}
                    </Button>
                ) : null}

                <ActionMenu
                    items={moreActions}
                    buttonLabel="More"
                    ariaLabel="Open more assignment actions"
                    hideLabelOnMobile={false}
                />
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

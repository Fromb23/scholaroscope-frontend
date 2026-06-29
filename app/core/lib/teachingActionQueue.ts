import type { AssessmentScore } from '@/app/core/types/assessment';
import type {
    AssignmentLifecycleNextAction,
    AssignmentTeachingTodayItem,
} from '@/app/core/types/assignments';
import type {
    Session,
    SessionLifecycleReminder,
} from '@/app/core/types/session';

export type TeachingActionObjectType =
    | 'session'
    | 'assignment'
    | 'assessment'
    | 'lesson_plan'
    | 'learner_support';

export type TeachingActionUrgency = 'danger' | 'warning' | 'info' | 'success';

export interface TeachingActionSecondaryAction {
    label: string;
    href: string;
    destructive?: boolean;
}

export interface TeachingActionItem {
    id: string;
    objectType: TeachingActionObjectType;
    objectId: number | string;
    dedupeKey: string;
    objectKey: string;
    priority: number;
    urgency: TeachingActionUrgency;
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryActions: TeachingActionSecondaryAction[];
    stageLabel: string;
    source: string;
    createdAt: string;
    session?: Session;
    assignmentWork?: AssignmentTeachingTodayItem;
    assessmentScore?: AssessmentScore;
}

export interface TeachingActionQueueInput {
    sessions?: Session[];
    sessionReminders?: SessionLifecycleReminder[];
    assignmentWork?: AssignmentTeachingTodayItem[];
    pendingAssessmentRows?: AssessmentScore[];
    pendingAssessmentReviewCount?: number;
    learnerSupportCount?: number;
    attendanceRiskCount?: number;
    teachingLoadCount?: number;
    workspaceShortcuts?: Array<{
        id: string;
        label: string;
        href: string;
        description?: string;
    }>;
    now?: Date;
}

export interface TeachingActionQueue {
    actions: TeachingActionItem[];
    primaryAction: TeachingActionItem | null;
    supportingActions: TeachingActionItem[];
    relatedPrimaryActions: TeachingActionItem[];
    suppressedObjectKeys: string[];
    suppressedDedupeKeys: string[];
    ownedObjectKeys: string[];
    ownedDedupeKeys: string[];
    unfinishedWorkCount: number;
    hasUrgentAction: boolean;
    quiet: boolean;
}

const SESSION_CLOSE_PRIORITY = 10;
const SESSION_ACTIVE_PRIORITY = 20;
const ASSIGNMENT_BLOCKER_PRIORITY = 30;
const ASSIGNMENT_REVIEW_PRIORITY = 40;
const ASSESSMENT_REVIEW_PRIORITY = 50;
const SESSION_READY_PRIORITY = 60;
const LESSON_PREPARATION_PRIORITY = 70;
const LEARNER_SUPPORT_PRIORITY = 80;
const WORKSPACE_SHORTCUT_PRIORITY = 90;

const urgencyRank: Record<TeachingActionUrgency, number> = {
    danger: 0,
    warning: 1,
    info: 2,
    success: 3,
};

function safeIso(value: string | null | undefined, fallback: Date): string {
    if (!value) {
        return fallback.toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

function sessionDateTime(session: Session, fallback: Date): string {
    if (session.scheduled_start_at) {
        return safeIso(session.scheduled_start_at, fallback);
    }

    const parsed = new Date(`${session.session_date}T${session.start_time ?? '00:00:00'}`);
    return Number.isNaN(parsed.getTime()) ? safeIso(session.created_at, fallback) : parsed.toISOString();
}

function sessionObjectKey(sessionId: number): string {
    return `session:${sessionId}`;
}

function assignmentObjectKey(assignmentId: number): string {
    return `assignment:${assignmentId}`;
}

function assessmentObjectKey(assessmentId: number | string): string {
    return `assessment:${assessmentId}`;
}

function getSessionLabel(session: Session): string {
    return `${session.subject_name} with ${session.cohort_name}`;
}

function isOverdueOpenSession(session: Session): boolean {
    return session.status === 'IN_PROGRESS'
        && (session.schedule_state === 'IN_PROGRESS_OVERDUE' || Boolean(session.needs_completion));
}

function isActiveSession(session: Session): boolean {
    return session.status === 'IN_PROGRESS' && !isOverdueOpenSession(session);
}

function isReadySession(session: Session): boolean {
    return session.status === 'SCHEDULED'
        && (session.schedule_state === 'SCHEDULED_READY' || Boolean(session.can_start_now));
}

function isOverdueScheduledSession(session: Session): boolean {
    return session.status === 'SCHEDULED' && session.schedule_state === 'SCHEDULED_OVERDUE';
}

function hasLessonPreparationNeed(session: Session): boolean {
    if (session.status !== 'SCHEDULED') {
        return false;
    }

    if (!session.lesson_plan_id) {
        return true;
    }

    const planStatus = session.lesson_plan_status?.trim().toUpperCase();
    return planStatus === 'DRAFT' || planStatus === 'GENERATED';
}

function buildClosingSessionAction(
    session: Session,
    now: Date,
    source: string,
    urgency: TeachingActionUrgency,
): TeachingActionItem {
    const label = getSessionLabel(session);

    return {
        id: `session-${session.id}-end-lesson`,
        objectType: 'session',
        objectId: session.id,
        dedupeKey: `${sessionObjectKey(session.id)}:end_lesson`,
        objectKey: sessionObjectKey(session.id),
        priority: SESSION_CLOSE_PRIORITY,
        urgency,
        title: `${session.subject_name} is still open`,
        description: `${label} is still open. Finish the teaching record when ready.`,
        primaryLabel: 'End lesson',
        primaryHref: `/sessions/${session.id}?section=complete&notice=session-current-step`,
        secondaryActions: [
            {
                label: 'Review attendance',
                href: `/sessions/${session.id}?section=attendance&notice=session-current-step`,
            },
            {
                label: 'Open lesson',
                href: `/sessions/${session.id}?notice=session-current-step`,
            },
        ],
        stageLabel: urgency === 'danger' ? 'Still open' : 'Needs closing',
        source,
        createdAt: sessionDateTime(session, now),
        session,
    };
}

function buildActiveSessionAction(session: Session, now: Date, source: string): TeachingActionItem {
    const label = getSessionLabel(session);

    return {
        id: `session-${session.id}-continue-lesson`,
        objectType: 'session',
        objectId: session.id,
        dedupeKey: `${sessionObjectKey(session.id)}:continue_lesson`,
        objectKey: sessionObjectKey(session.id),
        priority: SESSION_ACTIVE_PRIORITY,
        urgency: 'warning',
        title: 'Continue the lesson in progress',
        description: `${label} is open now. Keep the teaching record current before closing it.`,
        primaryLabel: 'Continue lesson',
        primaryHref: `/sessions/${session.id}?notice=session-current-step`,
        secondaryActions: [
            {
                label: 'Review attendance',
                href: `/sessions/${session.id}?section=attendance&notice=session-current-step`,
            },
            {
                label: 'End lesson',
                href: `/sessions/${session.id}?section=complete&notice=session-current-step`,
            },
        ],
        stageLabel: 'Still open',
        source,
        createdAt: sessionDateTime(session, now),
        session,
    };
}

function buildReadySessionAction(session: Session, now: Date): TeachingActionItem {
    const label = getSessionLabel(session);
    const overdue = isOverdueScheduledSession(session);

    return {
        id: `session-${session.id}-start-lesson`,
        objectType: 'session',
        objectId: session.id,
        dedupeKey: `${sessionObjectKey(session.id)}:start_lesson`,
        objectKey: sessionObjectKey(session.id),
        priority: SESSION_READY_PRIORITY,
        urgency: overdue ? 'warning' : 'success',
        title: overdue ? 'Decide on the missed lesson start' : 'Start the next lesson',
        description: overdue
            ? `${label} was scheduled earlier today. Open the lesson to start, reschedule, or cancel it.`
            : `${label} is ready${session.venue ? ` in ${session.venue}` : ''}.`,
        primaryLabel: overdue ? 'Open lesson' : 'Start lesson',
        primaryHref: `/sessions/${session.id}`,
        secondaryActions: session.lesson_plan_id
            ? [{ label: 'Review lesson plan', href: `/lesson-plans/${session.lesson_plan_id}` }]
            : [{ label: 'Prepare lesson', href: '/lesson-plans/new' }],
        stageLabel: overdue ? 'Needs attention' : 'Ready to start',
        source: 'today_schedule',
        createdAt: sessionDateTime(session, now),
        session,
    };
}

function buildLessonPreparationAction(session: Session, now: Date): TeachingActionItem {
    const hasDraftPlan = Boolean(session.lesson_plan_id);
    const label = getSessionLabel(session);

    return {
        id: `session-${session.id}-prepare-lesson`,
        objectType: 'lesson_plan',
        objectId: session.lesson_plan_id ?? session.id,
        dedupeKey: `${sessionObjectKey(session.id)}:prepare_lesson`,
        objectKey: sessionObjectKey(session.id),
        priority: LESSON_PREPARATION_PRIORITY,
        urgency: 'info',
        title: hasDraftPlan ? 'Review the lesson preparation' : 'Prepare the lesson',
        description: hasDraftPlan
            ? `${label} has a preparation that should be checked before teaching.`
            : `${label} does not have a linked lesson preparation yet.`,
        primaryLabel: hasDraftPlan ? 'Review lesson plan' : 'Prepare lesson',
        primaryHref: hasDraftPlan && session.lesson_plan_id ? `/lesson-plans/${session.lesson_plan_id}` : '/lesson-plans/new',
        secondaryActions: [{ label: 'Open lesson', href: `/sessions/${session.id}` }],
        stageLabel: hasDraftPlan ? 'Preparation needs review' : 'Preparation needed',
        source: 'lesson_preparation',
        createdAt: sessionDateTime(session, now),
        session,
    };
}

function buildSessionActions(
    sessions: Session[],
    reminders: SessionLifecycleReminder[],
    now: Date,
): TeachingActionItem[] {
    const actions: TeachingActionItem[] = [];
    const remindedSessionIds = new Set<number>();

    reminders.forEach((reminder) => {
        remindedSessionIds.add(reminder.session.id);

        if (reminder.type === 'UNFINISHED_LESSON') {
            actions.push(buildClosingSessionAction(reminder.session, now, 'session_reminder', 'danger'));
            return;
        }

        if (reminder.type === 'NEEDS_CLOSING') {
            actions.push(buildClosingSessionAction(reminder.session, now, 'session_reminder', 'warning'));
            return;
        }

        actions.push(buildActiveSessionAction(reminder.session, now, 'session_reminder'));
    });

    sessions.forEach((session) => {
        if (!remindedSessionIds.has(session.id)) {
            if (isOverdueOpenSession(session)) {
                actions.push(buildClosingSessionAction(session, now, 'today_schedule', 'warning'));
            } else if (isActiveSession(session)) {
                actions.push(buildActiveSessionAction(session, now, 'today_schedule'));
            }
        }

        if (isReadySession(session) || isOverdueScheduledSession(session)) {
            actions.push(buildReadySessionAction(session, now));
        }

        if (hasLessonPreparationNeed(session)) {
            actions.push(buildLessonPreparationAction(session, now));
        }
    });

    return actions;
}

function assignmentReminderTitle(item: AssignmentTeachingTodayItem): string {
    if (item.evidence_blocked || item.reminder_type === 'ASSIGNMENT_EVIDENCE_PENDING') {
        return item.evidence_blocked
            ? 'Evidence needs attention'
            : 'Reviewed learner work is ready for evidence';
    }

    switch (item.next_action) {
        case 'ISSUE_ASSIGNMENT':
            return 'Issue prepared learner task';
        case 'RECORD_SUBMISSION':
            return item.counts.submissions > 0 ? 'Record remaining learner responses' : 'Record learner responses';
        case 'REVIEW_WORK':
            return 'Review learner work';
        case 'STORE_RECORD':
            return 'Store reviewed learner work';
        case 'MANAGE_GROUPS':
            return 'Set up assignment groups';
        case 'MARK_PARTICIPATION':
            return 'Confirm group participation';
        case 'FINISH_LEARNER_WORK':
            return 'Close learner work';
        default:
            return item.next_action_label || item.teacher_stage_label;
    }
}

function assignmentActionPriority(item: AssignmentTeachingTodayItem): number {
    if (
        item.evidence_blocked
        || item.reminder_type === 'ASSIGNMENT_EVIDENCE_PENDING'
        || item.next_action === 'STORE_RECORD'
        || item.next_action === 'RECORD_EVIDENCE'
    ) {
        return ASSIGNMENT_BLOCKER_PRIORITY;
    }

    if (
        item.next_action === 'RECORD_SUBMISSION'
        || item.next_action === 'REVIEW_WORK'
        || item.next_action === 'FINISH_LEARNER_WORK'
    ) {
        return ASSIGNMENT_REVIEW_PRIORITY;
    }

    return ASSIGNMENT_REVIEW_PRIORITY + 5;
}

function assignmentActionUrgency(item: AssignmentTeachingTodayItem): TeachingActionUrgency {
    if (item.evidence_blocked || item.urgency === 'blocked') return 'danger';
    if (item.urgency === 'overdue' || item.counts.pending_reviews > 0 || item.counts.missing > 0) return 'warning';
    if (item.next_action === 'STORE_RECORD') return 'success';
    return 'info';
}

function assignmentSortValue(item: AssignmentTeachingTodayItem): number {
    const urgencyPriority: Record<AssignmentTeachingTodayItem['urgency'], number> = {
        blocked: 0,
        overdue: 1,
        due_soon: 2,
        normal: 3,
    };
    const actionPriority: Partial<Record<AssignmentLifecycleNextAction, number>> = {
        RECORD_EVIDENCE: 0,
        STORE_RECORD: 1,
        REVIEW_WORK: 2,
        RECORD_SUBMISSION: 3,
        FINISH_LEARNER_WORK: 4,
        ISSUE_ASSIGNMENT: 5,
        MANAGE_GROUPS: 6,
        MARK_PARTICIPATION: 7,
    };

    return (
        urgencyPriority[item.urgency] * 100
        + (item.evidence_blocked ? 0 : 10)
        + (actionPriority[item.next_action] ?? 50)
    );
}

export function sortAssignmentTeachingTodayItems(
    items: AssignmentTeachingTodayItem[],
): AssignmentTeachingTodayItem[] {
    return [...items].sort((left, right) => (
        assignmentSortValue(left) - assignmentSortValue(right)
        || (left.due_at ?? '').localeCompare(right.due_at ?? '')
        || left.title.localeCompare(right.title)
    ));
}

export function buildAssignmentTeachingActionItem(
    item: AssignmentTeachingTodayItem,
    now = new Date(),
): TeachingActionItem {
    const subjectLabel = `${item.subject.name} with ${item.cohort.name}`;
    const counts: string[] = [];

    if (item.counts.pending_reviews > 0) {
        counts.push(`${item.counts.pending_reviews} pending review${item.counts.pending_reviews === 1 ? '' : 's'}`);
    }
    if (item.counts.missing > 0) {
        counts.push(`${item.counts.missing} missing response${item.counts.missing === 1 ? '' : 's'}`);
    }
    if (item.counts.evidence_pending > 0) {
        counts.push(`${item.counts.evidence_pending} evidence item${item.counts.evidence_pending === 1 ? '' : 's'} pending`);
    }

    return {
        id: `assignment-${item.assignment_id}-${String(item.next_action).toLowerCase()}`,
        objectType: 'assignment',
        objectId: item.assignment_id,
        dedupeKey: `${assignmentObjectKey(item.assignment_id)}:${String(item.next_action).toLowerCase()}`,
        objectKey: assignmentObjectKey(item.assignment_id),
        priority: assignmentActionPriority(item),
        urgency: assignmentActionUrgency(item),
        title: assignmentReminderTitle(item),
        description: item.evidence_blocked
            ? `${item.title} (${subjectLabel}) needs evidence attention before the record can be stored. ${item.evidence_blocked_reason || ''}`.trim()
            : counts.length > 0
                ? `${item.title} (${subjectLabel}) is waiting on ${counts.join(', ')}.`
                : `${item.title} (${subjectLabel}) is in ${item.teacher_stage_label.toLowerCase()}. ${item.next_action_label}`,
        primaryLabel: item.next_action_label || 'Open assignment',
        primaryHref: item.next_action_href,
        secondaryActions: item.lesson_plan
            ? [{ label: 'Open lesson plan', href: `/lesson-plans/${item.lesson_plan.id}` }]
            : [],
        stageLabel: item.teacher_stage_label,
        source: item.source,
        createdAt: safeIso(item.due_at ?? item.starts_at, now),
        assignmentWork: item,
    };
}

function buildAssignmentActions(
    items: AssignmentTeachingTodayItem[],
    now: Date,
): TeachingActionItem[] {
    return sortAssignmentTeachingTodayItems(items)
        .filter((item) => item.lifecycle_stage !== 'STORED' && item.next_action !== 'NONE')
        .map((item) => buildAssignmentTeachingActionItem(item, now));
}

function buildAssessmentActions(
    rows: AssessmentScore[],
    pendingAssessmentReviewCount: number,
    now: Date,
): TeachingActionItem[] {
    const actions: TeachingActionItem[] = [];
    const rowsByAssessment = new Map<number, AssessmentScore[]>();

    rows.forEach((row) => {
        const existing = rowsByAssessment.get(row.assessment) ?? [];
        existing.push(row);
        rowsByAssessment.set(row.assessment, existing);
    });

    rowsByAssessment.forEach((assessmentRows, assessmentId) => {
        const orderedRows = [...assessmentRows].sort((left, right) => (
            left.student_name.localeCompare(right.student_name)
            || left.id - right.id
        ));
        const firstRow = orderedRows[0];

        actions.push({
            id: `assessment-${assessmentId}-record-scores`,
            objectType: 'assessment',
            objectId: assessmentId,
            dedupeKey: `${assessmentObjectKey(assessmentId)}:record_scores`,
            objectKey: assessmentObjectKey(assessmentId),
            priority: ASSESSMENT_REVIEW_PRIORITY,
            urgency: 'warning',
            title: 'Review learner scores',
            description: `${firstRow.assessment_name} has ${orderedRows.length} learner score${orderedRows.length === 1 ? '' : 's'} needing review.`,
            primaryLabel: 'Review next learner',
            primaryHref: `/assessments/${assessmentId}?focus=score-entry&student=${firstRow.student}`,
            secondaryActions: [{ label: 'Open assessment', href: `/assessments/${assessmentId}` }],
            stageLabel: 'Scores need review',
            source: 'assessment_review',
            createdAt: safeIso(firstRow.submitted_at ?? firstRow.graded_at, now),
            assessmentScore: firstRow,
        });
    });

    if (actions.length === 0 && pendingAssessmentReviewCount > 0) {
        actions.push({
            id: 'assessments-pending-review',
            objectType: 'assessment',
            objectId: 'pending-review',
            dedupeKey: 'assessment:pending-review:record_scores',
            objectKey: assessmentObjectKey('pending-review'),
            priority: ASSESSMENT_REVIEW_PRIORITY,
            urgency: 'warning',
            title: 'Review learner scores',
            description: `${pendingAssessmentReviewCount} assessment record${pendingAssessmentReviewCount === 1 ? '' : 's'} need review.`,
            primaryLabel: 'Open assessments',
            primaryHref: '/assessments?status=pending',
            secondaryActions: [],
            stageLabel: 'Scores need review',
            source: 'assessment_review',
            createdAt: now.toISOString(),
        });
    }

    return actions;
}

function buildLearnerSupportActions(input: TeachingActionQueueInput, now: Date): TeachingActionItem[] {
    const supportCount = Math.max(input.learnerSupportCount ?? 0, input.attendanceRiskCount ?? 0);

    if (supportCount <= 0) {
        return [];
    }

    return [{
        id: 'learner-support-follow-up',
        objectType: 'learner_support',
        objectId: 'follow-up',
        dedupeKey: 'learner_support:follow-up:review',
        objectKey: 'learner_support:follow-up',
        priority: LEARNER_SUPPORT_PRIORITY,
        urgency: 'warning',
        title: 'Check learners needing support',
        description: `${supportCount} learner${supportCount === 1 ? '' : 's'} need follow-up from attendance or recent performance.`,
        primaryLabel: 'View learners',
        primaryHref: '/learners',
        secondaryActions: input.attendanceRiskCount && input.attendanceRiskCount > 0
            ? [{ label: 'Attendance risk', href: '/reports/instructor/attendance-risk' }]
            : [],
        stageLabel: 'Follow-up needed',
        source: 'learner_support',
        createdAt: now.toISOString(),
    }];
}

function buildWorkspaceShortcutActions(
    input: TeachingActionQueueInput,
    now: Date,
): TeachingActionItem[] {
    const shortcuts = input.workspaceShortcuts ?? [];

    if (shortcuts.length > 0) {
        return shortcuts.map((shortcut, index) => ({
            id: `workspace-${shortcut.id}`,
            objectType: 'learner_support',
            objectId: shortcut.id,
            dedupeKey: `workspace:${shortcut.id}`,
            objectKey: `workspace:${shortcut.id}`,
            priority: WORKSPACE_SHORTCUT_PRIORITY + index,
            urgency: 'success',
            title: shortcut.label,
            description: shortcut.description ?? 'Workspace shortcut.',
            primaryLabel: shortcut.label,
            primaryHref: shortcut.href,
            secondaryActions: [],
            stageLabel: 'Workspace',
            source: 'workspace_shortcut',
            createdAt: now.toISOString(),
        }));
    }

    if ((input.teachingLoadCount ?? 0) === 0) {
        return [{
            id: 'workspace-teaching-load',
            objectType: 'learner_support',
            objectId: 'teaching-load',
            dedupeKey: 'workspace:teaching-load',
            objectKey: 'workspace:teaching-load',
            priority: WORKSPACE_SHORTCUT_PRIORITY,
            urgency: 'info',
            title: 'Your teaching load is not assigned yet',
            description: 'Once classes or subjects are assigned, lessons and teaching reminders will appear here.',
            primaryLabel: 'View teaching load',
            primaryHref: '/academic/cohorts',
            secondaryActions: [{ label: 'Submit request', href: '/requests/new' }],
            stageLabel: 'Workspace setup',
            source: 'workspace_shortcut',
            createdAt: now.toISOString(),
        }];
    }

    return [{
        id: 'workspace-quiet-day',
        objectType: 'learner_support',
        objectId: 'quiet-day',
        dedupeKey: 'workspace:quiet-day',
        objectKey: 'workspace:quiet-day',
        priority: WORKSPACE_SHORTCUT_PRIORITY,
        urgency: 'success',
        title: 'Nothing needs action right now',
        description: 'Unfinished teaching work is clear for now.',
        primaryLabel: 'View teaching load',
        primaryHref: '/academic/cohorts',
        secondaryActions: [{ label: 'Prepare lesson', href: '/lesson-plans/new' }],
        stageLabel: 'Quiet',
        source: 'workspace_shortcut',
        createdAt: now.toISOString(),
    }];
}

function rankActions(actions: TeachingActionItem[]): TeachingActionItem[] {
    return [...actions].sort((left, right) => (
        left.priority - right.priority
        || urgencyRank[left.urgency] - urgencyRank[right.urgency]
        || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        || left.title.localeCompare(right.title)
    ));
}

export function buildTeachingActionQueue(input: TeachingActionQueueInput): TeachingActionQueue {
    const now = input.now ?? new Date();
    const rawActions = [
        ...buildSessionActions(input.sessions ?? [], input.sessionReminders ?? [], now),
        ...buildAssignmentActions(input.assignmentWork ?? [], now),
        ...buildAssessmentActions(
            input.pendingAssessmentRows ?? [],
            input.pendingAssessmentReviewCount ?? 0,
            now,
        ),
        ...buildLearnerSupportActions(input, now),
        ...buildWorkspaceShortcutActions(input, now),
    ];

    const ranked = rankActions(rawActions);
    const actions: TeachingActionItem[] = [];
    const suppressedDedupeKeys = new Set<string>();
    const suppressedObjectKeys = new Set<string>();
    const seenDedupeKeys = new Set<string>();
    const seenObjectKeys = new Set<string>();

    ranked.forEach((action) => {
        if (seenDedupeKeys.has(action.dedupeKey) || seenObjectKeys.has(action.objectKey)) {
            suppressedDedupeKeys.add(action.dedupeKey);
            suppressedObjectKeys.add(action.objectKey);
            return;
        }

        actions.push(action);
        seenDedupeKeys.add(action.dedupeKey);
        seenObjectKeys.add(action.objectKey);
    });

    const primaryAction = actions[0] ?? null;
    const supportingActions = actions.slice(1).filter((action) => action.source !== 'workspace_shortcut');
    const relatedPrimaryActions = primaryAction
        ? ranked.filter((action) => (
            action.objectKey === primaryAction.objectKey
            && action.dedupeKey !== primaryAction.dedupeKey
        ))
        : [];
    const ownedObjectKeys = new Set(actions.map((action) => action.objectKey));
    const ownedDedupeKeys = new Set(actions.map((action) => action.dedupeKey));

    if (primaryAction) {
        suppressedObjectKeys.add(primaryAction.objectKey);
        suppressedDedupeKeys.add(primaryAction.dedupeKey);
    }

    const unfinishedWorkCount = actions.filter((action) => action.source !== 'workspace_shortcut').length;

    return {
        actions,
        primaryAction,
        supportingActions,
        relatedPrimaryActions,
        suppressedObjectKeys: Array.from(suppressedObjectKeys),
        suppressedDedupeKeys: Array.from(suppressedDedupeKeys),
        ownedObjectKeys: Array.from(ownedObjectKeys),
        ownedDedupeKeys: Array.from(ownedDedupeKeys),
        unfinishedWorkCount,
        hasUrgentAction: unfinishedWorkCount > 0,
        quiet: unfinishedWorkCount === 0,
    };
}

export function getSessionTeachingObjectKey(sessionId: number): string {
    return sessionObjectKey(sessionId);
}

export function getAssignmentTeachingObjectKey(assignmentId: number): string {
    return assignmentObjectKey(assignmentId);
}

export function getAssessmentTeachingObjectKey(assessmentId: number | string): string {
    return assessmentObjectKey(assessmentId);
}

import type {
    AssignmentGroupStudentSource,
    AssignmentRecipientMode,
} from '@/app/core/types/assignments';
import type { AssignmentOptionCardOption } from './AssignmentOptionCards';

export type TeacherAssignmentAudienceChoice =
    | 'present_in_lesson'
    | 'all_subject_learners'
    | 'selected_learners';

export type TeacherPublishAudienceChoice =
    | 'keep_current'
    | TeacherAssignmentAudienceChoice;

const LESSON_LINK_REQUIRED_HELPER = 'Link this assignment to a lesson before using attendance.';
const ATTENDANCE_INCOMPLETE_BACKEND_ERROR =
    'Attendance must be completed before assigning work to learners who attended this lesson.';

export const GROUP_ATTENDANCE_INCOMPLETE_ERROR =
    'Complete attendance for this lesson before grouping learners who attended.';

export function getDefaultTeacherAssignmentAudienceChoice(
    hasLinkedLesson: boolean
): TeacherAssignmentAudienceChoice {
    return hasLinkedLesson ? 'present_in_lesson' : 'all_subject_learners';
}

export function toAssignmentRecipientMode(
    choice: TeacherAssignmentAudienceChoice
): Exclude<AssignmentRecipientMode, 'none'> {
    switch (choice) {
        case 'present_in_lesson':
            return 'PRESENT_IN_SOURCE_SESSION';
        case 'selected_learners':
            return 'EXPLICIT_STUDENTS';
        case 'all_subject_learners':
        default:
            return 'ALL_ACTIVE_COHORT_LEARNERS';
    }
}

export function toAssignmentGroupStudentSource(
    choice: TeacherAssignmentAudienceChoice
): AssignmentGroupStudentSource {
    switch (choice) {
        case 'present_in_lesson':
            return 'PRESENT_IN_SOURCE_SESSION';
        case 'selected_learners':
            return 'EXPLICIT_STUDENTS';
        case 'all_subject_learners':
        default:
            return 'ALL_ACTIVE_COHORT_SUBJECT_LEARNERS';
    }
}

export function getAssignmentAudienceOptions(
    hasLinkedLesson: boolean
): Array<AssignmentOptionCardOption<TeacherAssignmentAudienceChoice>> {
    return [
        {
            value: 'present_in_lesson',
            label: 'Learners who attended this lesson',
            helper: hasLinkedLesson
                ? 'Uses attendance from the linked lesson. Present and late learners will receive the assignment.'
                : LESSON_LINK_REQUIRED_HELPER,
            disabled: !hasLinkedLesson,
        },
        {
            value: 'all_subject_learners',
            label: 'All learners taking this subject',
            helper: 'Everyone actively enrolled in this subject group will receive it.',
        },
        {
            value: 'selected_learners',
            label: 'Choose learners manually',
            helper: 'Select specific learners yourself.',
        },
    ];
}

export function getPublishAudienceOptions(
    hasLinkedLesson: boolean,
    hasExistingRecipients: boolean
): Array<AssignmentOptionCardOption<TeacherPublishAudienceChoice>> {
    const options: Array<AssignmentOptionCardOption<TeacherPublishAudienceChoice>> =
        getAssignmentAudienceOptions(hasLinkedLesson).map((option) => ({
            ...option,
            value: option.value,
        }));

    if (!hasExistingRecipients) {
        return options;
    }

    return [
        {
            value: 'keep_current',
            label: 'Keep current learner list',
            helper: 'Publish using the learners already attached to this assignment.',
        },
        ...options,
    ];
}

export function getGroupingAudienceOptions(
    hasLinkedLesson: boolean
): Array<AssignmentOptionCardOption<TeacherAssignmentAudienceChoice>> {
    return [
        {
            value: 'present_in_lesson',
            label: 'Learners who attended the linked lesson',
            helper: hasLinkedLesson
                ? 'Uses attendance from the linked lesson. Present and late learners will be grouped.'
                : LESSON_LINK_REQUIRED_HELPER,
            disabled: !hasLinkedLesson,
        },
        {
            value: 'all_subject_learners',
            label: 'All learners taking this subject',
            helper: 'Use everyone actively enrolled in this subject group.',
        },
        {
            value: 'selected_learners',
            label: 'Only learners I select',
            helper: 'Choose the learners to group yourself.',
        },
    ];
}

export function mapGroupingAudienceError(
    message: string,
    choice: TeacherAssignmentAudienceChoice
): string {
    if (
        choice === 'present_in_lesson'
        && message.includes(ATTENDANCE_INCOMPLETE_BACKEND_ERROR)
    ) {
        return GROUP_ATTENDANCE_INCOMPLETE_ERROR;
    }

    return message;
}

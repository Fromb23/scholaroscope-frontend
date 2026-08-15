import type { AdminGroupingMode } from '@/app/core/types/adminWorkViews';
import type { LessonPlan } from '@/app/core/types/lessonPlans';

export interface LessonPlanGroupSection {
    key: string;
    label: string;
    description: string;
    items: LessonPlan[];
}

export interface LessonPlanGroup {
    key: string;
    label: string;
    description: string;
    itemCount: number;
    sections: LessonPlanGroupSection[];
}

export function sortLessonPlans(items: LessonPlan[]): LessonPlan[] {
    return [...items].sort((left, right) => {
        const leftTimestamp = new Date(left.session_date ?? left.updated_at).getTime();
        const rightTimestamp = new Date(right.session_date ?? right.updated_at).getTime();

        if (leftTimestamp !== rightTimestamp) {
            return leftTimestamp - rightTimestamp;
        }

        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
}

export function getLessonPlanTeacherLabel(lessonPlan: LessonPlan): string {
    return lessonPlan.teacher_name?.trim() || 'Unassigned teacher';
}

export function buildLessonPlanGroups(
    lessonPlans: LessonPlan[],
    groupingMode: AdminGroupingMode,
    showInstructorContext = true,
): LessonPlanGroup[] {
    const groups = new Map<string, {
        label: string;
        description: string;
        itemCount: number;
        sections: Map<string, LessonPlanGroupSection>;
    }>();

    lessonPlans.forEach((lessonPlan) => {
        const cohortLabel = lessonPlan.cohort_name?.trim() || 'Unassigned class';
        const subjectLabel = lessonPlan.subject_name?.trim() || 'Unassigned subject';
        const instructorLabel = getLessonPlanTeacherLabel(lessonPlan);
        let groupKey = `cohort:${lessonPlan.cohort ?? cohortLabel}`;
        let groupLabel = cohortLabel;
        let groupDescription = "Class view starts from learners' classroom context.";
        let sectionKey = `subject:${lessonPlan.subject ?? subjectLabel}`;
        let sectionLabel = subjectLabel;
        let sectionDescription = showInstructorContext
            ? `${instructorLabel} ownership stays visible where supervision context needs it.`
            : 'Lesson plans for this class subject.';

        if (groupingMode === 'instructor') {
            groupKey = `teacher:${lessonPlan.teacher ?? instructorLabel}`;
            groupLabel = instructorLabel;
            groupDescription = 'Instructor view starts from teacher workload.';
            sectionKey = `class-subject:${lessonPlan.cohort ?? cohortLabel}:${lessonPlan.subject ?? subjectLabel}`;
            sectionLabel = `${cohortLabel} · ${subjectLabel}`;
            sectionDescription = 'Class and subject context for this instructor.';
        } else if (groupingMode === 'subject') {
            groupKey = `subject:${lessonPlan.subject ?? subjectLabel}`;
            groupLabel = subjectLabel;
            groupDescription = 'Subject view highlights where the teaching load sits across classes.';
            sectionKey = `class-teacher:${lessonPlan.cohort ?? cohortLabel}:${lessonPlan.teacher ?? instructorLabel}`;
            sectionLabel = `${cohortLabel} · ${instructorLabel}`;
            sectionDescription = showInstructorContext
                ? 'Class and instructor context for this subject.'
                : 'Class context for this subject.';
        }

        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                label: groupLabel,
                description: groupDescription,
                itemCount: 0,
                sections: new Map<string, LessonPlanGroupSection>(),
            });
        }

        const group = groups.get(groupKey);
        if (!group) {
            return;
        }

        group.itemCount += 1;

        if (!group.sections.has(sectionKey)) {
            group.sections.set(sectionKey, {
                key: sectionKey,
                label: sectionLabel,
                description: sectionDescription,
                items: [],
            });
        }

        group.sections.get(sectionKey)?.items.push(lessonPlan);
    });

    return Array.from(groups.entries())
        .map(([key, group]) => ({
            key,
            label: group.label,
            description: group.description,
            itemCount: group.itemCount,
            sections: Array.from(group.sections.values())
                .map((section) => ({
                    ...section,
                    items: sortLessonPlans(section.items),
                }))
                .sort((left, right) => left.label.localeCompare(right.label)),
        }))
        .sort((left, right) => left.label.localeCompare(right.label));
}

'use client';
import {
    registerLessonPlanScheduleExtension,
    type LessonPlanScheduleExtensionComponentProps,
} from '@/app/core/registry/lessonPlanScheduleExtensions';
import {
    registerSessionFormExtension,
    type SessionFormExtensionComponentProps,
} from '@/app/core/registry/sessionFormExtensions';
import { FineArtsPracticalFieldset } from '@/app/plugins/cbc/components/fineArts/FineArtsPracticalFieldset';
import {
    buildFineArtsPracticalContext,
    isCbcFineArtsLessonPlanPractical,
    isCbcFineArtsPracticalSession,
    resolveFineArtsTaskTermNumber,
} from '@/app/plugins/cbc/lib/fineArtsPracticals';

function SessionFormFineArtsPracticalExtension(props: SessionFormExtensionComponentProps) {
    const termNumber = resolveFineArtsTaskTermNumber(props.formData.term, props.terms);
    const practicalContext = props.formData.practical_context;

    return (
        <FineArtsPracticalFieldset
            title="Fine Arts coursework task"
            description="Choose the official Grade 10 Fine Arts coursework task for this practical session before you create it."
            selectedTaskId={practicalContext?.coursework_task_id ?? null}
            termNumber={termNumber}
            error={props.errors.practical_context}
            onTaskChange={(taskId, taskCode) => {
                props.onChange('practical_context', buildFineArtsPracticalContext(taskId, taskCode));
            }}
        />
    );
}

function LessonPlanFineArtsPracticalExtension(props: LessonPlanScheduleExtensionComponentProps) {
    const practicalContext = props.scheduleForm.practical_context;

    return (
        <FineArtsPracticalFieldset
            title="Fine Arts coursework task"
            description="Choose the official Grade 10 Fine Arts coursework task for this practical lesson before you schedule it."
            selectedTaskId={practicalContext?.coursework_task_id ?? null}
            error={props.errors.practical_context}
            onTaskChange={(taskId, taskCode) => {
                props.onChange({
                    practical_context: buildFineArtsPracticalContext(taskId, taskCode),
                });
            }}
        />
    );
}

registerSessionFormExtension({
    key: 'cbc-fine-arts-practical-form',
    priority: 10,
    supports: ({ formData, selectedCurriculum, selectedSubjectOption }) => isCbcFineArtsPracticalSession({
        curriculum_type: selectedCurriculum?.curriculum_type,
        session_type: formData.session_type,
        subject_code: selectedSubjectOption?.subject_code,
        subject_name: selectedSubjectOption?.subject_name ?? selectedSubjectOption?.label,
    }),
    Component: SessionFormFineArtsPracticalExtension,
    validate: ({ formData }): Record<string, string> => {
        if (formData.practical_context?.coursework_task_id || formData.practical_context?.task_code) {
            return {};
        }

        return {
            practical_context: 'Select the Fine Arts coursework task for this practical session.',
        };
    },
});

registerLessonPlanScheduleExtension({
    key: 'cbc-fine-arts-practical-schedule',
    priority: 10,
    supports: ({ lessonPlan, scheduleForm }) => isCbcFineArtsLessonPlanPractical({
        sessionType: scheduleForm.session_type,
        subjectName: lessonPlan.subject_name,
        plannedOutcomes: lessonPlan.planned_outcomes,
    }),
    Component: LessonPlanFineArtsPracticalExtension,
    validate: ({ scheduleForm }): Record<string, string> => {
        if (scheduleForm.practical_context?.coursework_task_id || scheduleForm.practical_context?.task_code) {
            return {};
        }

        return {
            practical_context: 'Select the Fine Arts coursework task for this practical session.',
        };
    },
});

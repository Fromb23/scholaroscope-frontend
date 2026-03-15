// ============================================================================
// utils/schemeDummyData.ts
// Dummy data generator for Scheme of Work - Demonstrates the full concept
// ============================================================================

import {
    SchemeTemplate,
    TeachingSession,
    SchemeAnalytics,
    SchemeStatus,
    UnitStatus,
    SessionStatus,
    CurriculumModel,
    SchemeWithDetails,
    SchemeUnit,
    SchemeTimeline
} from '@/app/plugins/schemes/types/schemes';

// ============================================================================
// Generate Dummy Scheme Templates
// ============================================================================

export const dummySchemeTemplates: SchemeTemplate[] = [
    {
        id: 1,
        cohort_subject: 1,
        cohort_subject_name: 'Form 3 - Mathematics',
        cohort_name: 'Form 3 East',
        subject_name: 'Mathematics',
        term: 1,
        term_name: 'Term 1',
        academic_year: '2025',
        curriculum_model: CurriculumModel.CBC,
        curriculum_model_ref: 'CBC Grade 7-9',
        week_span: 13,
        status: SchemeStatus.ACTIVE,
        created_at: '2025-01-05T08:00:00Z',
        created_by: 'teacher@school.com',
        updated_at: '2025-01-26T10:30:00Z',
        total_units: 8,
        completed_units: 3,
        total_sessions: 39,
        executed_sessions: 15,
        completion_percentage: 37.5
    },
    {
        id: 2,
        cohort_subject: 2,
        cohort_subject_name: 'Form 3 - English',
        cohort_name: 'Form 3 East',
        subject_name: 'English',
        term: 1,
        term_name: 'Term 1',
        academic_year: '2025',
        curriculum_model: CurriculumModel.EIGHT_FOUR_FOUR,
        week_span: 13,
        status: SchemeStatus.ACTIVE,
        created_at: '2025-01-05T09:00:00Z',
        created_by: 'teacher@school.com',
        updated_at: '2025-01-25T14:20:00Z',
        total_units: 10,
        completed_units: 4,
        total_sessions: 26,
        executed_sessions: 12,
        completion_percentage: 40
    },
    {
        id: 3,
        cohort_subject: 3,
        cohort_subject_name: 'Grade 7 - Science',
        cohort_name: 'Grade 7 Blue',
        subject_name: 'Integrated Science',
        term: 1,
        term_name: 'Term 1',
        academic_year: '2025',
        curriculum_model: CurriculumModel.CBC,
        curriculum_model_ref: 'CBC Grade 7 Science',
        week_span: 13,
        status: SchemeStatus.DRAFT,
        created_at: '2025-01-10T11:00:00Z',
        created_by: 'science.teacher@school.com',
        updated_at: '2025-01-20T16:45:00Z',
        total_units: 6,
        completed_units: 0,
        total_sessions: 18,
        executed_sessions: 0,
        completion_percentage: 0
    }
];

// ============================================================================
// Generate Dummy Units
// ============================================================================

export const dummySchemeUnits: SchemeUnit[] = [
    // Mathematics Units
    {
        id: 1,
        template: 1,
        sequence_index: 1,
        week_number: 1,
        strand: 'Numbers',
        sub_strand: 'Number Systems',
        learning_outcomes: [
            'Understand binary number system',
            'Convert between binary and decimal',
            'Apply binary in computing contexts'
        ],
        expected_sessions: 5,
        expected_duration_minutes: 240,
        expected_assessments: ['CAT 1'],
        resources: 'Binary charts, computing examples, worksheets',
        materials: ['Binary conversion charts', 'Computer lab access', 'Practice worksheets'],
        status: UnitStatus.COMPLETED,
        actual_sessions: 5,
        started_at: '2025-01-06T08:00:00Z',
        completed_at: '2025-01-10T11:00:00Z',
        teacher_notes: 'Students grasped binary concepts well. Computer lab session was particularly effective.'
    },
    {
        id: 2,
        template: 1,
        sequence_index: 2,
        week_number: 2,
        strand: 'Numbers',
        sub_strand: 'Operations',
        learning_outcomes: [
            'Perform binary addition',
            'Understand binary subtraction',
            'Apply operations in problem-solving'
        ],
        expected_sessions: 5,
        expected_duration_minutes: 240,
        resources: 'Practice problems, calculators',
        status: UnitStatus.COMPLETED,
        actual_sessions: 5,
        started_at: '2025-01-13T08:00:00Z',
        completed_at: '2025-01-17T11:00:00Z',
        teacher_notes: 'Binary addition went smoothly. Need to revisit subtraction - some confusion with borrowing.'
    },
    {
        id: 3,
        template: 1,
        sequence_index: 3,
        week_number: 3,
        strand: 'Algebra',
        sub_strand: 'Linear Equations',
        learning_outcomes: [
            'Solve simple linear equations',
            'Understand equation balancing',
            'Apply to real-world problems'
        ],
        expected_sessions: 5,
        expected_duration_minutes: 240,
        expected_assessments: ['Group Project'],
        resources: 'Algebra tiles, equation worksheets',
        status: UnitStatus.IN_PROGRESS,
        actual_sessions: 3,
        started_at: '2025-01-20T08:00:00Z',
        teacher_notes: 'Currently working on balancing equations. Students responding well to visual aids.'
    },
    {
        id: 4,
        template: 1,
        sequence_index: 4,
        week_number: 4,
        strand: 'Algebra',
        sub_strand: 'Graphing',
        learning_outcomes: [
            'Plot linear graphs',
            'Understand slope and intercept',
            'Interpret graphs in context'
        ],
        expected_sessions: 5,
        expected_duration_minutes: 240,
        resources: 'Graph paper, rulers, plotting software',
        status: UnitStatus.UNSTARTED,
        actual_sessions: 0
    },
    {
        id: 5,
        template: 1,
        sequence_index: 5,
        week_number: 6,
        strand: 'Geometry',
        sub_strand: 'Angles',
        learning_outcomes: [
            'Identify angle types',
            'Calculate angle measures',
            'Apply angle properties'
        ],
        expected_sessions: 4,
        expected_duration_minutes: 200,
        expected_assessments: ['CAT 2'],
        status: UnitStatus.UNSTARTED,
        actual_sessions: 0
    },
    // English Units
    {
        id: 6,
        template: 2,
        sequence_index: 1,
        week_number: 1,
        topic: 'Narrative Writing',
        objectives: [
            'Understand narrative structure',
            'Write compelling introductions',
            'Develop characters and settings'
        ],
        expected_sessions: 3,
        expected_duration_minutes: 135,
        status: UnitStatus.COMPLETED,
        actual_sessions: 3,
        started_at: '2025-01-06T09:00:00Z',
        completed_at: '2025-01-08T10:30:00Z',
        teacher_notes: 'Great engagement with story creation. Several students showed natural talent.'
    },
    {
        id: 7,
        template: 2,
        sequence_index: 2,
        week_number: 2,
        topic: 'Grammar: Tenses',
        objectives: [
            'Master past tense forms',
            'Use present perfect correctly',
            'Apply in writing contexts'
        ],
        expected_sessions: 2,
        expected_duration_minutes: 90,
        status: UnitStatus.COMPLETED,
        actual_sessions: 2,
        started_at: '2025-01-13T09:00:00Z',
        completed_at: '2025-01-14T10:30:00Z'
    },
    {
        id: 8,
        template: 2,
        sequence_index: 3,
        week_number: 3,
        topic: 'Reading Comprehension',
        objectives: [
            'Extract main ideas',
            'Analyze author\'s purpose',
            'Make inferences from text'
        ],
        expected_sessions: 3,
        expected_duration_minutes: 135,
        expected_assessments: ['Reading Assessment'],
        status: UnitStatus.IN_PROGRESS,
        actual_sessions: 2,
        started_at: '2025-01-20T09:00:00Z'
    }
];

// ============================================================================
// Generate Dummy Sessions
// ============================================================================

export const dummyTeachingSessions: TeachingSession[] = [
    {
        id: 1,
        scheme_unit: 1,
        cohort_subject: 1,
        session_date: '2025-01-06',
        start_time: '08:00',
        end_time: '08:45',
        duration_minutes: 45,
        status: SessionStatus.EXECUTED,
        content_covered: 'Introduction to binary system. Historical context and modern applications.',
        activities: ['Lecture', 'Discussion', 'Binary counting exercise'],
        teacher_note: 'Students very engaged. Good questions about computer applications.',
        what_went_well: 'Clear explanations, students grasped concept quickly',
        what_needs_improvement: 'Need more hands-on activities',
        next_steps: 'Move to conversion exercises tomorrow',
        attendance_summary: {
            total_students: 32,
            present: 30,
            absent: 2,
            attendance_rate: 93.75
        },
        created_at: '2025-01-06T08:00:00Z',
        updated_at: '2025-01-06T09:00:00Z',
        created_by: 'teacher@school.com'
    },
    {
        id: 2,
        scheme_unit: 1,
        cohort_subject: 1,
        session_date: '2025-01-07',
        start_time: '08:00',
        end_time: '08:45',
        duration_minutes: 45,
        status: SessionStatus.EXECUTED,
        content_covered: 'Binary to decimal conversion methods',
        activities: ['Worked examples', 'Practice problems', 'Peer teaching'],
        teacher_note: 'Excellent progress. Students helping each other.',
        what_went_well: 'Peer teaching strategy worked brilliantly',
        attendance_summary: {
            total_students: 32,
            present: 32,
            absent: 0,
            attendance_rate: 100
        },
        created_at: '2025-01-07T08:00:00Z',
        updated_at: '2025-01-07T09:00:00Z',
        created_by: 'teacher@school.com'
    },
    {
        id: 3,
        scheme_unit: 1,
        cohort_subject: 1,
        session_date: '2025-01-08',
        start_time: '10:00',
        end_time: '11:30',
        duration_minutes: 90,
        status: SessionStatus.EXECUTED,
        content_covered: 'Computer lab session - Binary in computing',
        activities: ['Computer lab work', 'Binary calculators', 'Coding examples'],
        teacher_note: 'Lab session very successful. Students made connections to real programming.',
        what_went_well: 'Hands-on experience made concepts concrete',
        what_needs_improvement: 'Need more computers - some students shared',
        attendance_summary: {
            total_students: 32,
            present: 31,
            absent: 1,
            attendance_rate: 96.88
        },
        assessment_references: [1],
        created_at: '2025-01-08T10:00:00Z',
        updated_at: '2025-01-08T12:00:00Z',
        created_by: 'teacher@school.com'
    },
    {
        id: 4,
        scheme_unit: 2,
        cohort_subject: 1,
        session_date: '2025-01-13',
        start_time: '08:00',
        end_time: '08:45',
        duration_minutes: 45,
        status: SessionStatus.EXECUTED,
        content_covered: 'Binary addition - rules and examples',
        activities: ['Demonstration', 'Guided practice', 'Independent work'],
        teacher_note: 'Good understanding of addition. Moving to subtraction next.',
        attendance_summary: {
            total_students: 32,
            present: 29,
            absent: 3,
            attendance_rate: 90.63
        },
        created_at: '2025-01-13T08:00:00Z',
        updated_at: '2025-01-13T09:00:00Z',
        created_by: 'teacher@school.com'
    },
    {
        id: 5,
        scheme_unit: 3,
        cohort_subject: 1,
        session_date: '2025-01-20',
        start_time: '08:00',
        end_time: '08:45',
        duration_minutes: 45,
        status: SessionStatus.EXECUTED,
        content_covered: 'Introduction to linear equations',
        activities: ['Lecture', 'Worked examples', 'Practice problems'],
        teacher_note: 'Started equation balancing. Students need more practice.',
        attendance_summary: {
            total_students: 32,
            present: 30,
            absent: 2,
            attendance_rate: 93.75
        },
        created_at: '2025-01-20T08:00:00Z',
        updated_at: '2025-01-20T09:00:00Z',
        created_by: 'teacher@school.com'
    }
];

// ============================================================================
// Generate Analytics
// ============================================================================

export const dummySchemeAnalytics: SchemeAnalytics = {
    template_id: 1,
    planned_weeks: 13,
    actual_weeks: 3,
    weeks_ahead_behind: 0,
    total_units: 8,
    completed_units: 2,
    in_progress_units: 1,
    unstarted_units: 5,
    deferred_units: 0,
    total_planned_sessions: 39,
    executed_sessions: 15,
    missed_sessions: 0,
    backfilled_sessions: 0,
    assessments_planned: 4,
    assessments_executed: 1,
    average_attendance_rate: 94.8,
    total_teaching_minutes: 675,
    average_session_duration: 45
};

// ============================================================================
// Generate Timeline
// ============================================================================

export const dummySchemeTimeline: SchemeTimeline[] = [
    {
        week_number: 1,
        week_start: '2025-01-06',
        week_end: '2025-01-10',
        units: [dummySchemeUnits[0]],
        sessions: dummyTeachingSessions.slice(0, 3),
        assessments: [],
        status: 'completed'
    },
    {
        week_number: 2,
        week_start: '2025-01-13',
        week_end: '2025-01-17',
        units: [dummySchemeUnits[1]],
        sessions: [dummyTeachingSessions[3]],
        assessments: [],
        status: 'completed'
    },
    {
        week_number: 3,
        week_start: '2025-01-20',
        week_end: '2025-01-24',
        units: [dummySchemeUnits[2]],
        sessions: [dummyTeachingSessions[4]],
        assessments: [],
        status: 'current'
    },
    {
        week_number: 4,
        week_start: '2025-01-27',
        week_end: '2025-01-31',
        units: [dummySchemeUnits[3]],
        sessions: [],
        assessments: [],
        status: 'upcoming'
    }
];

// ============================================================================
// Get Full Scheme with Details
// ============================================================================

export const getDummySchemeWithDetails = (id: number): SchemeWithDetails | null => {
    const template = dummySchemeTemplates.find(t => t.id === id);
    if (!template) return null;

    const units = dummySchemeUnits.filter(u => u.template === id);

    return {
        ...template,
        units,
        analytics: dummySchemeAnalytics,
        timeline: dummySchemeTimeline
    };
};

// ============================================================================
// Export all dummy data
// ============================================================================

export const schemeDummyData = {
    templates: dummySchemeTemplates,
    units: dummySchemeUnits,
    sessions: dummyTeachingSessions,
    analytics: dummySchemeAnalytics,
    timeline: dummySchemeTimeline,
    getSchemeWithDetails: getDummySchemeWithDetails
};
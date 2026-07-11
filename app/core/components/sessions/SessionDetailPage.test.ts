import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/sessions/SessionDetailPage.tsx'),
  'utf8',
);

describe('SessionDetailPage attendance learner links', () => {
  it('builds attendance learner links from session context', () => {
    const component = source();

    expect(component).toContain('buildSessionLearnerAttendanceReportHref');
    expect(component).toContain('studentId: record.student');
    expect(component).toContain('sessionId: session.id');
    expect(component).toContain('termId: session.term');
    expect(component).toContain('cohortId: session.cohort_id');
    expect(component).toContain('subjectId: session.subject_id');
    expect(component).toContain('cohortSubjectId: session.cohort_subject');
  });

  it('passes the scoped learner href builder into AttendanceTable', () => {
    const component = source();

    expect(component).toContain('learnerHrefBuilder={buildAttendanceLearnerHref}');
  });

  it('keeps session ask-admin actions behind backend workspace governance', () => {
    const component = source();

    expect(component).toContain('supportsInternalRequests');
    expect(component).toContain('showInternalRequestActions');
    expect(component).toContain('(!canCreateTeachingRecords || isCompleted) && showInternalRequestActions');
    expect(component).toContain('Ask admin to reschedule');
  });
});

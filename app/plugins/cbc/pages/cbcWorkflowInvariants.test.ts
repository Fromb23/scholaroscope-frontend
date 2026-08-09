import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
    return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('CBC management workflow invariants', () => {
    it('selects management and teaching catalogue scope from operating context', () => {
        const context = source('app/plugins/cbc/context/CBCContext.tsx');
        const browser = source('app/plugins/cbc/hooks/useCBCBrowserPage.ts');
        const progress = source('app/plugins/cbc/hooks/useCBCProgressPage.ts');

        expect(context).toContain("activeOperatingContext === 'WORKSPACE_MANAGEMENT'");
        expect(context).not.toContain('isTeachingActorView(can_teach)');
        expect(browser).toContain("authority_mode: isAdmin ? 'supervision' as const : 'teaching' as const");
        expect(progress).toContain("authority_mode: isAdmin ? 'supervision' : 'teaching'");
        expect(browser).toContain('selectedSubjectFilterId: effectiveSubjectId');
        expect(progress).toContain('selectedSubjectFilterId: effectiveSubjectId');
    });

    it('normalizes optional strand search fields before lowercasing', () => {
        const browser = source('app/plugins/cbc/hooks/useCBCBrowserPage.ts');
        expect(browser).toContain("(strand.code ?? '').toLowerCase()");
        expect(browser).toContain("(strand.description ?? '').toLowerCase()");
    });

    it('preserves exact CBC progress identities without comparing link IDs as subjects', () => {
        const progress = source('app/core/components/instructors/InstructorProgressComponents.tsx');
        const destination = source('app/plugins/cbc/hooks/useCBCCohortProgressPage.ts');

        expect(progress).toContain('subject: String(assignment.topic_subject_id)');
        expect(progress).toContain("params.set('cbc_cohort_subject_id'");
        expect(destination).toContain('.map((assignment) => assignment.topic_subject_id)');
        expect(destination).toContain('assignment.cohort_subject_id === queryCohortSubjectId');
        expect(destination).toContain('assignment.cbc_cohort_subject_id === queryCbcCohortSubjectId');
    });
});

describe('CBC result scale and presentation invariants', () => {
    it('preserves the pagination envelope and uses cohort-first server endpoints', () => {
        const hook = source('app/plugins/cbc/hooks/useCbcAssessmentReportResults.ts');
        const api = source('app/plugins/cbc/api/cbc.ts');
        const root = source('app/plugins/cbc/pages/CBCAssessmentReportResultsPage.tsx');

        expect(hook).toContain('query.data?.count ?? 0');
        expect(hook).not.toContain('toArray(await cbcAPI.getAssessmentReportResults');
        expect(api).toContain('/cohort-overview/');
        expect(api).toContain('/cohort-learners/');
        expect(api).toContain('/learner-results/');
        expect(api).toContain('{ params: { authority_mode: authorityMode } }');
        expect(root).toContain('distinct_learner_count');
        expect(root).not.toContain('results.filter');
    });

    it('never renders raw computation JSON while keeping score sections visible', () => {
        const detail = source('app/plugins/cbc/pages/CBCAssessmentReportResultDetailPage.tsx');
        const resultTypes = source('app/plugins/cbc/types/cbc.ts');

        expect(detail).not.toContain('JSON.stringify');
        expect(detail).not.toContain('computation_details');
        const publicResultContract = resultTypes.slice(
            resultTypes.indexOf('export interface CbcAssessmentReportResult'),
            resultTypes.indexOf('export interface CbcAssessmentReportResultFilters'),
        );
        expect(publicResultContract).not.toContain('computation_details');
        expect(detail).toContain('Component Scores');
        expect(detail).toContain('Diagnostic Scores');
        expect(detail).toContain('Calculation Summary');
    });
});

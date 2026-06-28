#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

const detailPage = read('app/core/components/assignments/CohortAssignmentDetailPage.tsx');
const groupReviewForm = read('app/core/components/assignments/AssignmentGroupReviewForm.tsx');
const teachingTodayHook = read('app/core/hooks/useTeachingToday.ts');
const selectedReviewStart = detailPage.indexOf('const selectedReviewSubmission = useMemo');
const selectedReviewEnd = detailPage.indexOf('const selectedReviewEvaluation', selectedReviewStart);
const selectedReviewBlock = selectedReviewStart >= 0 && selectedReviewEnd > selectedReviewStart
  ? detailPage.slice(selectedReviewStart, selectedReviewEnd)
  : detailPage;

check(
  'normal assignment workflow must not expose a manual CBC bridge button',
  !detailPage.includes('Bridge to CBC Evidence')
    && !detailPage.includes('Bridge to CBC evidence')
    && !groupReviewForm.includes('Bridge to CBC evidence'),
  'Remove manual CBC bridge buttons from assignment workflow components; evidence is created automatically after review finalization.',
);

check(
  'assignment review panel must not auto-open from pending submissions',
  !selectedReviewBlock.includes('pendingReviewSubmissions[0]')
    && !detailPage.includes('reviewPanelManuallyHidden'),
  'Do not derive selectedReviewSubmission from the first pending submission on page load.',
);

check(
  'assignment detail records must be behind progressive disclosure',
  detailPage.includes('advancedDetailsOpen')
    && detailPage.includes('Show assignment records')
    && detailPage.includes('Hide assignment records'),
  'Recipients, submissions, evaluations, and groups must stay behind the advanced details toggle by default.',
);

check(
  'Teaching Today must use the assignment workflow source',
  teachingTodayHook.includes('useAssignmentTeachingToday')
    && teachingTodayHook.includes('assignmentWork'),
  'Teaching Today must fetch assignment lifecycle work instead of inferring it from local page state.',
);

check(
  'assignment evidence status must come from backend lifecycle state',
  detailPage.includes('evaluation.evidence_status')
    && detailPage.includes('evidence_warning'),
  'Assignment evidence status should be rendered from evaluation/lifecycle backend fields.',
);

const failures = checks.filter((item) => !item.passed);

if (failures.length > 0) {
  console.error('Assignment workflow architecture check failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(`Assignment workflow architecture check passed (${checks.length} checks).`);

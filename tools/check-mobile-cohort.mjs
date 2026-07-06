#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`${relativePath} must exist.`);
    return '';
  }
  return read(relativePath);
}

function fail(message) {
  failures.push(message);
}

function assertNoJsWidthDetection(relativePath, source) {
  for (const forbidden of ['window.innerWidth', 'matchMedia', 'useMediaQuery']) {
    if (source.includes(forbidden)) {
      fail(`${relativePath} must not use ${forbidden} to switch cohort mobile and desktop views.`);
    }
  }
}

const adminCohortsPath = 'app/core/components/academic/cohorts/AdminCohortsPageContent.tsx';
const cohortMobileCardPath = 'app/core/components/academic/cohorts/CohortMobileCard.tsx';
const participationPath = 'app/core/components/cohorts/CohortSubjectParticipationSection.tsx';
const classActionsMobilePath = 'app/core/components/cohorts/ClassActionsMobile.tsx';
const actionSourcePath = 'app/core/components/academic/cohorts/cohortSubjectActions.ts';

const adminCohorts = requireFile(adminCohortsPath);
const cohortMobileCard = requireFile(cohortMobileCardPath);
if (adminCohorts) {
  if (!/CohortMobileCard/.test(adminCohorts) || !/md:hidden/.test(adminCohorts)) {
    fail(`${adminCohortsPath} must render a md:hidden CohortMobileCard list for phones.`);
  }

  if (!/hidden\s+md:block[\s\S]*<DataTable/.test(adminCohorts) && !/<DataTable[\s\S]*hidden\s+md:block/.test(adminCohorts)) {
    fail(`${adminCohortsPath} must wrap the desktop DataTable in hidden md:block.`);
  }

  assertNoJsWidthDetection(adminCohortsPath, adminCohorts);
}
if (cohortMobileCard) {
  assertNoJsWidthDetection(cohortMobileCardPath, cohortMobileCard);
}

const participation = requireFile(participationPath);
if (participation) {
  if (!/ClassActionsMobile/.test(participation)) {
    fail(`${participationPath} must render the extracted mobile class-action surface.`);
  }

  if (!/hidden\s+flex-wrap\s+gap-2\s+md:flex/.test(participation)) {
    fail(`${participationPath} must keep the existing desktop class-action list as the md+ surface.`);
  }

  assertNoJsWidthDetection(participationPath, participation);
}

const classActionsMobile = requireFile(classActionsMobilePath);
if (classActionsMobile) {
  if (!/md:hidden/.test(classActionsMobile)) {
    fail(`${classActionsMobilePath} must show the class-action card surface with CSS md:hidden.`);
  }

  if (!/splitCohortSubjectMobileActions/.test(classActionsMobile) || !/cohortSubjectActions/.test(classActionsMobile)) {
    fail(`${classActionsMobilePath} must group mobile actions through cohortSubjectActions.ts.`);
  }

  const hardcodedActionLabels = [
    'Manage learners',
    'Prepare scheme',
    'Prepare lesson',
    'Record lesson',
    'Assignments',
    'Assessments',
    'Set report rules',
    'Calculate subject report',
    'Open subject report',
    'View CBC content',
    'Check CBC progress',
  ];
  for (const label of hardcodedActionLabels) {
    if (classActionsMobile.includes(label)) {
      fail(`${classActionsMobilePath} must not hardcode the ${label} action list; use cohortSubjectActions.ts.`);
    }
  }

  assertNoJsWidthDetection(classActionsMobilePath, classActionsMobile);
}

const actionSource = requireFile(actionSourcePath);
if (actionSource) {
  if (!/COHORT_SUBJECT_ACTION_MOBILE_PRESENTATION/.test(actionSource)) {
    fail(`${actionSourcePath} must define the mobile daily/setup split as a single source of truth.`);
  }

  const expectedGroups = new Map([
    ['Manage learners', 'daily'],
    ['Prepare scheme', 'setup'],
    ['Prepare lesson', 'daily'],
    ['Record lesson', 'daily'],
    ['Assignments', 'daily'],
    ['Assessments', 'daily'],
    ['Set report rules', 'setup'],
    ['Calculate subject report', 'setup'],
    ['Open subject report', 'daily'],
    ['View CBC content', 'setup'],
    ['Check CBC progress', 'daily'],
  ]);

  for (const [label, group] of expectedGroups) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedLabel}[\\s\\S]*?mobileGroup:\\s*['"]${group}['"]`);
    if (!pattern.test(actionSource)) {
      fail(`${actionSourcePath} must classify "${label}" as ${group} for mobile cohort actions.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Mobile cohort UI check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Mobile cohort UI check passed.');

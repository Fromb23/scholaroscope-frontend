#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    fail(`${relativePath} must exist.`);
    return '';
  }
  return read(relativePath);
}

function walk(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  const entries = readdirSync(absoluteDir);
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(root, relativePath);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      files.push(...walk(relativePath));
      continue;
    }
    if (stats.isFile() && /\.(ts|tsx)$/.test(entry)) {
      files.push(relativePath);
    }
  }

  return files;
}

function normalizePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function assertNoJsWidthDetection(relativePath, source) {
  for (const forbidden of ['window.innerWidth', 'matchMedia', 'useMediaQuery']) {
    if (source.includes(forbidden)) {
      fail(`${relativePath} must not use ${forbidden} to switch mobile stat rendering.`);
    }
  }
}

function assertStatsCardMobileMode(relativePath, source, title, expectedMode) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<StatsCard[\\s\\S]*?title=["']${escapedTitle}["'][\\s\\S]*?mobile=["']${expectedMode}["']`);
  if (!pattern.test(source)) {
    fail(`${relativePath} must mark "${title}" as mobile="${expectedMode}".`);
  }
}

const statsCardPath = 'app/components/dashboard/StatsCard.tsx';
const statStripPath = 'app/components/dashboard/StatStrip.tsx';
const statsCard = requireFile(statsCardPath);
const statStrip = requireFile(statStripPath);

if (statsCard) {
  if (!/md:hidden/.test(statsCard)) {
    fail(`${statsCardPath} must render a md:hidden compact mobile branch.`);
  }
  if (!/hidden\s+md:block/.test(statsCard)) {
    fail(`${statsCardPath} must render the full desktop branch with hidden md:block.`);
  }
  if (!/mobile\s*=\s*['"]compact['"]/.test(statsCard)) {
    fail(`${statsCardPath} must default mobile rendering to compact.`);
  }
  assertNoJsWidthDetection(statsCardPath, statsCard);
}

if (statStrip) {
  if (!/grid-cols-2/.test(statStrip) || !/md:grid-cols-/.test(statStrip)) {
    fail(`${statStripPath} must centralize mobile and desktop stat grid classes.`);
  }
  assertNoJsWidthDetection(statStripPath, statStrip);
}

const statsUsageFiles = walk('app').filter((relativePath) => {
  const normalizedPath = normalizePath(relativePath);
  if (!normalizedPath.endsWith('.tsx')) return false;
  if (normalizedPath === statsCardPath) return false;
  if (normalizedPath === 'app/core/components/DesktopOnly.tsx') return false;
  return read(relativePath).includes('<StatsCard');
});

for (const relativePath of statsUsageFiles) {
  const source = read(relativePath);
  if (!source.includes('<StatStrip')) {
    fail(`${relativePath} must wrap StatsCard blocks in StatStrip.`);
  }
  if (/<div[^>]+className=["'][^"']*grid[^"']*["'][\s\S]{0,600}<StatsCard/.test(source)) {
    fail(`${relativePath} must not wrap StatsCard blocks in a raw grid div.`);
  }
  assertNoJsWidthDetection(relativePath, source);
}

const namedPages = [
  {
    path: 'app/core/components/assessments/AssessmentsOverview.tsx',
    decisions: [
      ['Total Assessments', 'hide'],
      ['Active', 'compact'],
      ['Finalized', 'hide'],
      ['Stalled', 'compact'],
    ],
  },
  {
    path: 'app/core/components/sessions/TodaySessionsPage.tsx',
    decisions: [
      ['Total Sessions', 'hide'],
      ['Ongoing', 'compact'],
      ['Attendance Marked', 'compact'],
      ['Avg Attendance', 'hide'],
    ],
  },
  {
    path: 'app/core/components/reports/AttendanceReportStats.tsx',
    decisions: [
      ['Records', 'hide'],
      ['Avg Attendance', 'compact'],
      ['Total Sessions', 'hide'],
      ['At Risk (<75%)', 'compact'],
    ],
  },
  {
    path: 'app/core/components/assessments/AssessmentDetailPage.tsx',
    decisions: [
      ['Scored', 'compact'],
      ['Average', 'hide'],
      ['Highest', 'hide'],
      ['Lowest', 'hide'],
      ['Completion', 'compact'],
    ],
  },
  {
    path: 'app/core/components/learners/LearnersPage.tsx',
    decisions: [
      ['Total', 'compact'],
      ['Active', 'compact'],
      ['Graduated', 'hide'],
      ['Transferred', 'hide'],
    ],
  },
  {
    path: 'app/core/components/academic/cohorts/InstructorMyCohortsPageContent.tsx',
    decisions: [
      ['Assigned Classes', 'hide'],
      ['Assigned Subjects', 'hide'],
      ['Current Year Classes', 'hide'],
    ],
  },
  {
    path: 'app/plugins/cbc/components/progress/CBCProgressPage.tsx',
    decisions: [
      ['Strands', 'hide'],
      ['Sub-Strands', 'hide'],
      ['Learning Goals', 'hide'],
      ['Subjects', 'compact'],
    ],
  },
  {
    path: 'app/core/components/admin/instructors/InstructorProgressPage.tsx',
    decisions: [
      ['Total Sessions', 'hide'],
      ['This Month', 'compact'],
      ['Avg Attendance', 'compact'],
      ['Cohorts', 'hide'],
    ],
  },
];

for (const page of namedPages) {
  const source = requireFile(page.path);
  if (!source) continue;
  if (!source.includes('<StatStrip')) {
    fail(`${page.path} must wrap the named stat block in StatStrip.`);
  }
  for (const [title, mode] of page.decisions) {
    assertStatsCardMobileMode(page.path, source, title, mode);
  }
}

if (failures.length > 0) {
  console.error('Mobile stats UI check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Mobile stats UI check passed.');

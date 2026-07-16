#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2']);
const DEFAULT_BASELINE_PATH = path.join(cwd, 'tools/workspace-boundary-baseline.json');
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const scanRoot = path.resolve(readArg('--root', path.join(cwd, 'app')));
const baselinePath = path.resolve(readArg('--baseline', DEFAULT_BASELINE_PATH));
const printBaseline = args.includes('--print-baseline');

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function relativeToScanRoot(filePath) {
  return toPosix(path.relative(scanRoot, filePath));
}

function walk(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'coverage', 'dist', 'build', '.git'].includes(entry)) return [];
      return walk(fullPath);
    }
    return [fullPath];
  });
}

function shouldScan(file) {
  if (!/\.(tsx?|jsx?)$/.test(file)) return false;
  if (/\.d\.ts$/.test(file)) return false;
  if (/\.(test|spec)\.(tsx?|jsx?)$/.test(file)) return false;
  return true;
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function isAllowedRawRolePath(relative) {
  return [
    /^utils\/permissions\.ts$/,
    /^core\/lib\/workspaces\.ts$/,
    /^core\/types\//,
    /^core\/api\//,
    /^core\/errors\//,
  ].some((pattern) => pattern.test(relative));
}

function isAllowedWorkspaceBehaviorPath(relative) {
  return [
    /^core\/lib\/workspaces\.ts$/,
    /^core\/types\//,
    /^core\/api\//,
    /^core\/errors\//,
    /^context\/AuthContext\.tsx$/,
  ].some((pattern) => pattern.test(relative));
}

function isAllowedPersonalOrgPath(relative) {
  return [
    /^core\/lib\/workspaces\.ts$/,
    /^core\/hooks\/useRegister\.ts$/,
    /^core\/components\/auth\/RegisterPage\.tsx$/,
    /^core\/api\//,
    /^core\/types\//,
    /^context\/AuthContext\.tsx$/,
  ].some((pattern) => pattern.test(relative));
}

function isAllowedStaffCopyPath(relative) {
  return [
    /^core\/lib\/workspaces\.ts$/,
    /^core\/errors\//,
    /^core\/components\/superadmin\//,
    /^core\/components\/admin\/instructors\//,
    /^components\/layout\/navConfig\.ts$/,
  ].some((pattern) => pattern.test(relative));
}

function countCanManageUsersWithoutCapabilities(source) {
  const calls = source.matchAll(/\bcanManageUsers\s*\(([^)]*)\)/g);
  let count = 0;
  for (const call of calls) {
    const argsText = call[1] ?? '';
    const argCount = argsText.trim()
      ? argsText.split(',').map((item) => item.trim()).filter(Boolean).length
      : 0;
    if (argCount < 3) count += 1;
  }
  return count;
}

const STAFF_COPY_TERMS = [
  'Staff',
  'Manage staff',
  'Instructors',
  'Admin dashboard',
  'Institution Management',
  'Organization reports',
  'User management',
  'Members',
];
const staffCopyLiteralPattern = new RegExp(`(['"\`])(?:${STAFF_COPY_TERMS.join('|')})\\1`, 'g');
const staffCopyJsxTextPattern = new RegExp(`>\\s*(?:${STAFF_COPY_TERMS.join('|')})\\s*<`, 'g');

const RULES = [
  {
    id: 'raw-admin-role-check',
    skip: isAllowedRawRolePath,
    test: (source) => countMatches(source, /\b(?:activeRole|role)\s*(?:===|!==)\s*['"]ADMIN['"]/g),
  },
  {
    id: 'admin-or-above-workspace-ui',
    skip: (relative) => /^utils\/permissions\.ts$/.test(relative),
    test: (source) => countMatches(source, /\bisAdminOrAbove\s*\(/g),
  },
  {
    id: 'can-manage-users-without-capabilities',
    skip: (relative) => /^utils\/permissions\.ts$/.test(relative),
    test: countCanManageUsersWithoutCapabilities,
  },
  {
    id: 'raw-workspace-behavior-check',
    skip: isAllowedWorkspaceBehaviorPath,
    test: (source) => countMatches(
      source,
      /\b(?:workspace_behavior|workspaceBehavior)\s*(?:===|!==)\s*['"](?:FREELANCE_TEACHER|SELF_MANAGED)['"]/g,
    ),
  },
  {
    id: 'raw-personal-org-type-check',
    skip: isAllowedPersonalOrgPath,
    test: (source) => countMatches(
      source,
      /\b(?:org_type|orgType)\s*(?:===|!==)\s*['"]PERSONAL['"]|\bactiveOrg\??\.org_type\s*(?:===|!==)\s*['"]PERSONAL['"]|\bform\.org_type\s*(?:===|!==)\s*['"]PERSONAL['"]/g,
    ),
  },
  {
    id: 'freelance-risky-staff-admin-copy',
    skip: isAllowedStaffCopyPath,
    test: (source, relative) => {
      if (!/\.tsx$/.test(relative)) return 0;
      return countMatches(source, staffCopyLiteralPattern) + countMatches(source, staffCopyJsxTextPattern);
    },
  },
];

const REQUIRED_WORKSPACE_GENERATION_ANCHORS = new Map([
  [
    'context/AuthContext.tsx',
    [
      ['workspaceGeneration', 'advanceWorkspaceGeneration'],
      ['captureWorkspaceAuthority', 'getAccessTokenVersion', 'isWorkspaceAuthorityCurrent'],
    ],
  ],
  [
    'core/api/client.ts',
    [
      ['_workspaceGeneration', 'getWorkspaceGeneration'],
      ['assertWorkspaceGeneration', 'WorkspaceGenerationSupersededError'],
    ],
  ],
  [
    'core/hooks/useNotifications.ts',
    [
      ['useWorkspaceGeneration', 'captureWorkspaceAuthority'],
      ['setNotifications([])', 'setUnreadCount(0)', 'previousSnapshot.current = new Map()'],
    ],
  ],
  [
    '(dashboard)/DashboardClientShell.tsx',
    [['WorkspaceGenerationBoundary']],
  ],
]);

function missingWorkspaceGenerationAnchorCount(source, relative) {
  const requiredGroups = REQUIRED_WORKSPACE_GENERATION_ANCHORS.get(relative);
  if (!requiredGroups) return 0;
  return requiredGroups.filter(
    (group) => !group.every((anchor) => source.includes(anchor)),
  ).length;
}

function collectFindings() {
  const files = existsSync(scanRoot) ? walk(scanRoot).filter(shouldScan) : [];
  const findings = new Map();

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const relative = relativeToScanRoot(file);

    for (const rule of RULES) {
      if (rule.skip?.(relative)) continue;
      const count = rule.test(source, relative);
      if (count > 0) {
        findings.set(`${relative}::${rule.id}`, count);
      }
    }

    const missingGenerationAnchors = missingWorkspaceGenerationAnchorCount(source, relative);
    if (missingGenerationAnchors > 0) {
      findings.set(
        `${relative}::workspace-generation-boundary`,
        missingGenerationAnchors,
      );
    }
  }

  return findings;
}

function readBaseline() {
  if (!existsSync(baselinePath)) return {};
  return JSON.parse(readFileSync(baselinePath, 'utf8'));
}

function validateBaselineEntry(key, entry, today) {
  const errors = [];
  if (!entry || typeof entry !== 'object') {
    return [`${key} must be an object with count, reason, owner, priority, and removeBy.`];
  }
  if (!Number.isInteger(entry.count) || entry.count < 0) errors.push(`${key} has invalid count.`);
  if (typeof entry.reason !== 'string' || entry.reason.trim().length === 0) errors.push(`${key} is missing reason.`);
  if (typeof entry.owner !== 'string' || entry.owner.trim().length === 0) errors.push(`${key} is missing owner.`);
  if (!VALID_PRIORITIES.has(entry.priority)) errors.push(`${key} has invalid priority.`);
  if (typeof entry.removeBy !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.removeBy)) {
    errors.push(`${key} has invalid removeBy.`);
  } else if (new Date(`${entry.removeBy}T23:59:59Z`) < today) {
    errors.push(`${key} baseline expired on ${entry.removeBy}.`);
  }
  return errors;
}

function priorityFor(key) {
  if (
    /dashboard|Sidebar|Header|navConfig|profile|settings|learners|cohorts|lessonPlans|sessions|reports|workspaces|\(dashboard\)\/layout/.test(key)
  ) {
    return 'P0';
  }
  if (/assessments|assignments|schemes|cbc|cambridge/i.test(key)) {
    return 'P1';
  }
  return 'P2';
}

function removeByFor(priority) {
  if (priority === 'P0') return '2026-08-31';
  if (priority === 'P1') return '2026-10-31';
  return '2026-12-31';
}

function suggestedBaseline(findings) {
  return Object.fromEntries(
    [...findings.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => {
      const priority = priorityFor(key);
      return [
        key,
        {
          count,
          reason: 'Existing workspace/capability boundary migration debt. Do not add raw role, workspace behavior, or staff-management assumptions.',
          owner: 'frontend-migration',
          priority,
          removeBy: removeByFor(priority),
        },
      ];
    }),
  );
}

const findings = collectFindings();

if (printBaseline) {
  process.stdout.write(`${JSON.stringify(suggestedBaseline(findings), null, 2)}\n`);
  process.exit(0);
}

const baseline = readBaseline();
const failures = [];
const suggestions = [];
const today = new Date();

for (const [key, entry] of Object.entries(baseline)) {
  failures.push(...validateBaselineEntry(key, entry, today));
  const currentCount = findings.get(key) ?? 0;
  if (entry && typeof entry === 'object' && Number.isInteger(entry.count) && currentCount < entry.count) {
    suggestions.push(`${key} dropped from ${entry.count} to ${currentCount}; update or remove this baseline entry.`);
  }
}

for (const [key, count] of findings.entries()) {
  const baselineEntry = baseline[key];
  if (!baselineEntry) {
    failures.push(`${key} has ${count} finding(s) and is not in the workspace boundary baseline.`);
    continue;
  }
  if (count > baselineEntry.count) {
    failures.push(`${key} increased from baseline ${baselineEntry.count} to ${count}.`);
  }
}

if (failures.length > 0) {
  console.error('Workspace boundary guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (suggestions.length > 0) {
  console.log('Workspace boundary baseline can be reduced:');
  suggestions.forEach((suggestion) => console.log(`- ${suggestion}`));
}

const activeBaseline = Object.entries(baseline)
  .filter(([key, entry]) => (findings.get(key) ?? 0) > 0 && entry.count > 0)
  .length;

console.log(`Workspace boundary guard passed. Active baseline entries: ${activeBaseline}.`);

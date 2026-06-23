import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const appRoot = join(root, 'app');
const maxLines = 35;
const failures = [];

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      entries.push(...walk(path));
    } else if (name === 'page.tsx') {
      entries.push(path);
    }
  }
  return entries;
}

function rel(path) {
  return relative(root, path).replaceAll('\\', '/');
}

function addFailure(path, reason) {
  failures.push(`${rel(path)} ${reason}`);
}

function stripImportsAndExportedPage(source) {
  return source
    .replace(/^'use client';\s*/m, '')
    .replace(/^import[\s\S]*?;\s*$/gm, '')
    .replace(/export default function Page\s*\([^)]*\)\s*\{[\s\S]*?\}\s*$/m, '');
}

for (const path of walk(appRoot)) {
  const source = readFileSync(path, 'utf8');
  const lines = source.split(/\r?\n/);
  const bodyWithoutImportsAndPage = stripImportsAndExportedPage(source);

  if (lines.length > maxLines) {
    addFailure(path, `exceeds ${maxLines} lines`);
  }

  const hookMatch = source.match(/\buse(?:State|Effect|Memo|Callback|Reducer|Ref|Params|SearchParams|Router|Pathname)\s*\(/);
  if (hookMatch) {
    addFailure(path, `contains ${hookMatch[0].replace(/\s*\($/, '')}`);
  }

  for (const match of source.matchAll(/(?:^|\n)\s*(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (match[1] !== 'Page') {
      addFailure(path, `declares local component/helper ${match[1]}`);
    }
  }

  const arrowComponent = source.match(/(?:^|\n)\s*const\s+([A-Z][A-Za-z0-9_$]*)\s*(?::[^=]+)?=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/);
  if (arrowComponent) {
    addFailure(path, `declares local arrow component ${arrowComponent[1]}`);
  }

  const typeDeclaration = source.match(/(?:^|\n)\s*(?:export\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/);
  if (typeDeclaration) {
    addFailure(path, `declares local ${typeDeclaration[1]}`);
  }

  const localUiData = source.match(/(?:^|\n)\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\[|\{)/);
  if (localUiData) {
    addFailure(path, `declares local UI data ${localUiData[1]}`);
  }

  if (/\bcolumns\s*[:=]|Column<|DataTable/.test(source)) {
    addFailure(path, 'contains table column/list implementation');
  }

  if (/\b(validate|filter|group|sort|reduce|map[A-Z][A-Za-z0-9_$]*|build[A-Z][A-Za-z0-9_$]*|resolve[A-Z][A-Za-z0-9_$]*)\s*\(/.test(bodyWithoutImportsAndPage)) {
    addFailure(path, 'contains local validation/helper/domain logic');
  }

  const jsxTagCount = [...source.matchAll(/<[A-Z][A-Za-z0-9_.]*(?:\s|>|\/)/g)].length;
  if (jsxTagCount > 1) {
    addFailure(path, `contains a large JSX block (${jsxTagCount} component tags)`);
  }

  if (!/export default function Page\s*\(/.test(source)) {
    addFailure(path, 'does not export a default Page function');
  }
}

if (failures.length > 0) {
  console.error('Thin page check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Thin page check passed.');

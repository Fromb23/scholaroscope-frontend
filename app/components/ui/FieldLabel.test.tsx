import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FieldLabel } from './FieldLabel';

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return collectTsxFiles(path);
    }

    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });
}

describe('FieldLabel required marker contract', () => {
  it('renders a compact visual marker with accessible required text', () => {
    const html = renderToStaticMarkup(
      <FieldLabel htmlFor="email" required>
        Email Address
      </FieldLabel>,
    );

    expect(html).toContain('for="email"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('>*</span>');
    expect(html).toContain('sr-only');
    expect(html).toContain('required');
    expect(html).not.toContain('REQUIRED');
    expect(html).not.toContain('rounded-full');
  });

  it('does not reintroduce legacy required badges or literal required stars in labels', () => {
    const offenders = collectTsxFiles(join(process.cwd(), 'app'))
      .map((path) => ({
        path,
        source: readFileSync(path, 'utf8'),
      }))
      .flatMap(({ path, source }) => {
        const failures: string[] = [];

        if (/rounded-full[\s\S]{0,220}(?:text-red|border-red|bg-red)[\s\S]{0,220}\bRequired\b/.test(source)) {
          failures.push('legacy Required badge');
        }

        if (/label="[^"]+\s\*"/.test(source)) {
          failures.push('literal * inside label prop');
        }

        return failures.map((failure) => `${path}: ${failure}`);
      });

    expect(offenders).toEqual([]);
  });
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('PWA integrity architecture', () => {
  it('passes the PWA integrity checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-pwa-integrity.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('keeps API bypass ahead of app-shell navigation fallback', () => {
    const serviceWorker = read('public/sw.js');

    expect(serviceWorker).toContain("if (request.method !== 'GET' || isApiRequest(url))");
    expect(serviceWorker).toContain('cache.match(APP_SHELL_URL)');
    expect(serviceWorker).toContain('cache.match(OFFLINE_URL)');
  });
});

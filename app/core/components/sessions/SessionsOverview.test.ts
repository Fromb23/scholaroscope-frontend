import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/sessions/SessionsOverview.tsx'),
  'utf8',
);

describe('SessionsOverview instructor identity display', () => {
  it('passes the explicit instructor identity policy through desktop and mobile renderers', () => {
    const component = source();

    expect(component).toContain('shouldShowInstructorIdentity');
    expect(component).toContain('showInstructorIdentity ? <TableHead>Instructor</TableHead> : null');
    expect(component).toContain('showInstructorIdentity ? (');
    expect(component).toContain('<Users className="h-4 w-4 theme-subtle shrink-0" />');
    expect(component).toContain('showInstructorIdentity={showInstructorIdentity}');
  });

  it('keeps instructor-group supervision tables explicitly identified', () => {
    const component = source();

    expect(component).toContain('renderInstructorGroup');
    expect(component).toContain('showInstructorIdentity={true}');
  });
});

import React from 'react';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTable, type Column } from '@/app/components/ui/Table';
import {
  ButtonPendingContent,
  EntityLoadingState,
  ReportPreparingState,
} from '@/app/components/ui/loading';

interface Row extends Record<string, unknown> {
  name: string;
}

const columns: Column<Row>[] = [{ key: 'name', header: 'Name' }];

describe('loading architecture primitives', () => {
  it('DataTable renders skeleton rows when loadingVariant is skeleton', () => {
    const html = renderToStaticMarkup(
      <DataTable<Row>
        data={[]}
        columns={columns}
        loading
        loadingMessage="Loading learner records..."
        loadingVariant="skeleton"
        skeletonRows={2}
        enableSearch={false}
      />,
    );

    expect(html).toContain('table-fixed');
    expect(html).toContain('animate-pulse');
  });

  it('DataTable shows the supplied loading message for spinner loading', () => {
    const html = renderToStaticMarkup(
      <DataTable<Row>
        data={[]}
        columns={columns}
        loading
        loadingMessage="Loading instructor accounts..."
        enableSearch={false}
      />,
    );

    expect(html).toContain('Loading instructor accounts...');
  });

  it('ButtonPendingContent preserves the pending action label', () => {
    const html = renderToStaticMarkup(
      <button>
        <ButtonPendingContent pending pendingLabel="Saving learner profile...">
          Save
        </ButtonPendingContent>
      </button>,
    );

    expect(html).toContain('Saving learner profile...');
  });

  it('ReportPreparingState renders title and steps', () => {
    const html = renderToStaticMarkup(
      <ReportPreparingState
        title="Building learner overview report..."
        steps={['Collecting learner profile', 'Preparing recommendations']}
        activeStep={1}
      />,
    );

    expect(html).toContain('Building learner overview report...');
    expect(html).toContain('Collecting learner profile');
    expect(html).toContain('Preparing recommendations');
  });

  it('EntityLoadingState formats entity-specific copy', () => {
    const html = renderToStaticMarkup(
      <EntityLoadingState entity="learner report" name="Mary Wanjiku" action="Building" />,
    );

    expect(html).toContain("Building Mary Wanjiku&#x27;s learner report...");
  });

  it('check-loading-copy catches raw Loading copy in a fixture', () => {
    const fixtureDir = join(process.cwd(), '.tmp-loading-check');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(join(fixtureDir, 'Bad.tsx'), 'export function Bad() { return <p>{"Loading..."}</p>; }');

    try {
      expect(() => execFileSync('node', ['tools/check-loading-copy.mjs', fixtureDir])).toThrow();
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});

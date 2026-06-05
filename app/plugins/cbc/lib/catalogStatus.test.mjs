import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import ts from 'typescript';

const modulePath = path.resolve(
    process.cwd(),
    'app/plugins/cbc/lib/catalogStatus.ts',
);

let modulePromise;

async function loadCatalogStatusModule() {
    if (!modulePromise) {
        modulePromise = readFile(modulePath, 'utf8').then(source => {
            const transpiled = ts.transpileModule(source, {
                compilerOptions: {
                    module: ts.ModuleKind.ESNext,
                    target: ts.ScriptTarget.ES2020,
                },
                fileName: modulePath,
            });
            const encoded = Buffer.from(transpiled.outputText).toString('base64');
            return import(`data:text/javascript;base64,${encoded}`);
        });
    }

    return modulePromise;
}

test('modal status helper never resolves all registered for 0/0 sub-strands', async () => {
    const { resolveCBCCatalogBadge } = await loadCatalogStatusModule();

    assert.equal(
        resolveCBCCatalogBadge({
            registration_status: 'FULLY_REGISTERED',
            content_status: 'CATALOGUE_ONLY',
            any_registered: false,
            all_registered: false,
            total_sub_strands_count: 0,
        }),
        null,
    );
});

test('modal status helper renders catalogue-only badge for catalogue-only levels', async () => {
    const { resolveCBCCatalogBadge } = await loadCatalogStatusModule();

    assert.deepEqual(
        resolveCBCCatalogBadge({
            registration_status: 'CATALOGUE_ONLY',
            content_status: 'CATALOGUE_ONLY',
            any_registered: false,
            all_registered: false,
            total_sub_strands_count: 0,
        }),
        {
            kind: 'CATALOGUE_ONLY',
            label: 'Catalogue only',
            className:
                'text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full',
        },
    );
});

test('modal status helper renders all registered only for real fully-registered content', async () => {
    const { resolveCBCCatalogBadge } = await loadCatalogStatusModule();

    assert.deepEqual(
        resolveCBCCatalogBadge({
            registration_status: 'FULLY_REGISTERED',
            content_status: 'CONTENT_READY',
            any_registered: true,
            all_registered: true,
            total_sub_strands_count: 2,
        }),
        {
            kind: 'FULLY_REGISTERED',
            label: 'All registered',
            className:
                'text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full',
        },
    );
});

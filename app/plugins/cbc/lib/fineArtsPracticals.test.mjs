import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import ts from 'typescript';

const modulePath = path.resolve(
    process.cwd(),
    'app/plugins/cbc/lib/fineArtsPracticals.ts',
);

let modulePromise;

async function loadFineArtsPracticalModule() {
    if (!modulePromise) {
        modulePromise = readFile(modulePath, 'utf8').then((source) => {
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

test('detects CBC Fine Arts practical sessions deterministically', async () => {
    const { isCbcFineArtsPracticalSession } = await loadFineArtsPracticalModule();

    assert.equal(
        isCbcFineArtsPracticalSession({
            curriculum_type: 'CBE',
            session_type: 'PRACTICAL',
            subject_code: 'FINEARTS',
            subject_name: 'Fine Arts',
        }),
        true,
    );

    assert.equal(
        isCbcFineArtsPracticalSession({
            curriculum_type: 'CBE',
            session_type: 'LESSON',
            subject_code: 'FINEARTS',
            subject_name: 'Fine Arts',
        }),
        false,
    );

    assert.equal(
        isCbcFineArtsPracticalSession({
            curriculum_type: 'CBE',
            session_type: 'PRACTICAL',
            subject_code: 'BIO',
            subject_name: 'Biology',
        }),
        false,
    );
});

test('detects Fine Arts lesson-plan practical scheduling without title guessing', async () => {
    const { isCbcFineArtsLessonPlanPractical } = await loadFineArtsPracticalModule();

    assert.equal(
        isCbcFineArtsLessonPlanPractical({
            sessionType: 'PRACTICAL',
            subjectName: 'Fine Arts',
            plannedOutcomes: [{ plugin: 'cbc' }],
        }),
        true,
    );

    assert.equal(
        isCbcFineArtsLessonPlanPractical({
            sessionType: 'PRACTICAL',
            subjectName: 'Theatre & Film',
            plannedOutcomes: [{ plugin: 'cbc' }],
        }),
        false,
    );
});

test('builds Fine Arts practical context only when a task is selected', async () => {
    const { buildFineArtsPracticalContext } = await loadFineArtsPracticalModule();

    assert.equal(buildFineArtsPracticalContext(), undefined);
    assert.deepEqual(buildFineArtsPracticalContext(12, null), {
        family: 'FINE_ARTS',
        coursework_task_id: 12,
    });
});

test('builds the dedicated Fine Arts practical workflow href for closure evidence', async () => {
    const { buildFineArtsPracticalWorkflowHref } = await loadFineArtsPracticalModule();

    assert.equal(
        buildFineArtsPracticalWorkflowHref(42, '/sessions/42?section=complete'),
        '/cbc/teaching/sessions/42/fine-arts-practical?action=record-evidence&notice=closure-evidence-required&returnTo=%2Fsessions%2F42%3Fsection%3Dcomplete',
    );
});

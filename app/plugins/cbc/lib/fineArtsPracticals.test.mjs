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
        '/cbc/teaching/sessions/42/practical?action=record-evidence&notice=closure-evidence-required&returnTo=%2Fsessions%2F42%3Fsection%3Dcomplete',
    );
});

test('filters Fine Arts worksheet learners by name or admission number', async () => {
    const { filterFineArtsLearners } = await loadFineArtsPracticalModule();

    const learners = [
        { learner_id: 1, name: 'Fine Artist', admission_number: 'FA001' },
        { learner_id: 2, name: 'Mary Achieng', admission_number: 'FA002' },
    ];

    assert.deepEqual(
        filterFineArtsLearners(learners, 'mary').map((learner) => learner.learner_id),
        [2],
    );
    assert.deepEqual(
        filterFineArtsLearners(learners, 'fa001').map((learner) => learner.learner_id),
        [1],
    );
});

test('restores persisted worksheet selection without resetting the active learner flow', async () => {
    const { sanitizeFineArtsWorksheetUiState } = await loadFineArtsPracticalModule();

    const learners = [
        {
            learner_id: 1,
            name: 'Fine Artist',
            admission_number: 'FA001',
            evidence: {
                PROCESS_JOURNAL: { recorded: true },
                RESEARCH_WRITEUP: { recorded: false },
            },
        },
        {
            learner_id: 2,
            name: 'Mary Achieng',
            admission_number: 'FA002',
            evidence: {
                PROCESS_JOURNAL: { recorded: false },
                RESEARCH_WRITEUP: { recorded: false },
            },
        },
    ];

    assert.deepEqual(
        sanitizeFineArtsWorksheetUiState({
            state: {
                activeSection: 'learner',
                search: 'mary',
                learnerId: 1,
                evidenceType: 'RESEARCH_WRITEUP',
            },
            learners,
            evidenceTypes: ['PROCESS_JOURNAL', 'RESEARCH_WRITEUP'],
            fallbackActiveSection: 'proof',
        }),
        {
            activeSection: 'learner',
            search: 'mary',
            learnerId: 1,
            evidenceType: 'RESEARCH_WRITEUP',
        },
    );
});

test('falls back to the next valid worksheet learner selection after attendance membership changes', async () => {
    const { sanitizeFineArtsWorksheetUiState, getNextFineArtsWorksheetTarget } = await loadFineArtsPracticalModule();

    const learners = [
        {
            learner_id: 2,
            name: 'Mary Achieng',
            admission_number: 'FA002',
            evidence: {
                PROCESS_JOURNAL: { recorded: false },
                RESEARCH_WRITEUP: { recorded: false },
            },
        },
    ];

    assert.deepEqual(
        sanitizeFineArtsWorksheetUiState({
            state: {
                activeSection: 'learner',
                learnerId: 1,
                evidenceType: 'PROCESS_JOURNAL',
            },
            learners,
            evidenceTypes: ['PROCESS_JOURNAL', 'RESEARCH_WRITEUP'],
            fallbackActiveSection: 'proof',
        }),
        {
            activeSection: 'learner',
            search: '',
            learnerId: 2,
            evidenceType: 'PROCESS_JOURNAL',
        },
    );

    assert.deepEqual(
        getNextFineArtsWorksheetTarget({
            learners: [
                {
                    learner_id: 1,
                    evidence: {
                        PROCESS_JOURNAL: { recorded: true },
                        RESEARCH_WRITEUP: { recorded: true },
                    },
                },
                {
                    learner_id: 2,
                    evidence: {
                        PROCESS_JOURNAL: { recorded: false },
                        RESEARCH_WRITEUP: { recorded: true },
                    },
                },
            ],
            currentLearnerId: 1,
            currentEvidenceType: 'PROCESS_JOURNAL',
            evidenceTypes: ['PROCESS_JOURNAL', 'RESEARCH_WRITEUP'],
            preferredEvidenceTypes: ['PROCESS_JOURNAL', 'RESEARCH_WRITEUP'],
        }),
        {
            learnerId: 2,
            evidenceType: 'PROCESS_JOURNAL',
        },
    );
});

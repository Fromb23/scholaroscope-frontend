# Scholaroscope frontend working contract

Scholaroscope manages internal teaching evidence and evaluation alongside KNEC. Never imply that internal finalization submits a KNEC mark. Teachers capture and evaluate learning; administrators and supervisors manage institutional setup and audited exceptions. Render backend authority: do not infer business permission from a broad role.

Use these terms precisely: observation, project evidence, evaluation, finalized evaluation, CBC evidence, and external KNEC mark. Capture remains available when official use is blocked; officialization is explicit, controlled, and auditable.

## Before changing the frontend

Roles do not form a hierarchy and never inherit permissions. Role titles and legacy membership roles are classification only; authority comes exclusively from backend-projected effective assignments and exact capabilities. Principal is the workspace-wide, permission-bounded `OVERSIGHT` responsibility, not owner, Administrator, or Teacher. Principal routes and components must use `INSTITUTION_OVERSIGHT` plus capabilities and must never infer authority from `activeRole`. New permissions are default-deny and must be explicitly classified as read, review, approval, operation, or technical administration and added to canonical role contracts.

Principal remains a canonical protected system role and cannot be assigned through generic role APIs. Workspace administrators appoint and manage Principal tenure only through the protected lifecycle and the exact server-projected Principal-management permission. Role definitions, membership classifications, staff assignments, and operating contexts remain independent; URL state uses workspace membership identity for staff-role management and never confers authority.

Future AI tools must call governed application services. They must never query unrestricted database state or treat a model as an authority source.

Principal Academic Overview is a read-only facade over the canonical reporting engine. Its authority comes only from backend-projected permissions in `INSTITUTION_OVERSIGHT`; traversing curriculum -> academic year -> term -> cohort -> cohort subject -> projection/record never grants mutation authority. Parent changes clear invalid descendants in URL state. Principal drill-down uses neutral canonical report routes, not instructor routes, and `returnTo` is sanitized navigation state rather than authorization or resource scope. New academic domains extend this hierarchy instead of adding Principal sidebar destinations.

Principal conversation routes identify selected UI state but never authorize records. Conversation history and title search are server-scoped to the active user and workspace, show at most ten recent rows initially, and page older/search results instead of building an unbounded browser list. New-conversation navigation remains unsaved until an authorized first message is accepted; titles are plain text and renameable. The conversation shell survives academic-context failures, reports disconnected intelligence honestly, and derives the Principal interface label from `INSTITUTION_OVERSIGHT`, never the reverse.

Read `README.md`, `docs/frontend-workspace-state.md`, `package.json`, `app/core/api/projects.ts`, `app/core/hooks/useProjects.ts`, `app/core/types/projects.ts`, the relevant components and tests under `app/core/components/projects`, `app/core/lib/queryKeys.ts`, and relevant checks under `tools`.

Change the backend contract first. Keep `page.tsx` thin and follow component → hook → API adapter layering. Query keys must include organization identity, and workspace-generation changes must reset cached state. Do not expose platform-control-plane UI or cross plugin boundaries.

URL state owns workspace navigation: deployment, task, scope, group, participant/evaluation, section, and sanitized `returnTo`. Store drafts by stable IDs, never list index. Previous/Next must preserve drafts; failed saves retain input and position. Save Draft and Save & Next persist editable work only. Finalize is separate, confirmed, and explains locking/projection consequences. Group scores are a starting point for canonical members and remain individually adjustable.

Orient every project screen to its stage and provide one primary next action; place secondary actions under More where density warrants it. Preserve teaching memory when navigating. Every changed workflow needs deliberate loading, empty, error, validation, keyboard, mobile, and unsaved-change behavior.

When a cross-repository contract changes: backend model/service/API/tests, then frontend types/API/hooks/components/tests. Update regression tests whenever an invariant changes.

Password-reset requests, validation, and consumption are public identity operations and must not use authenticated refresh recovery, workspace generation, membership state, or organization headers. Model valid, expired, used, superseded, and invalid token codes explicitly; transport, server, CORS, timeout, and malformed-response failures are an unavailable state, never an invalid-token state. Never send reset tokens or reset URLs to logs, telemetry, monitoring metadata, or page titles. Identity changes require focused end-to-end lifecycle coverage.

Focused validation:

```text
npm run typecheck
npm run lint
npm run test -- --run
npm run check:architecture
npm run build
git diff --check
```

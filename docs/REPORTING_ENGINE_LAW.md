# Scholaroscope Reporting Engine Law

This document is the normative architecture contract for workspace reporting. The backend repository points here and keeps only its server-specific enforcement appendix. Changes to this law must be reviewed together with the frontend and backend architecture guards.

1. There is exactly one workspace reporting engine.
2. Reports are identified by the object being reported on.
3. Tabs and projections represent questions about that object.
4. Operational features perform actions and may enter reporting with explicit intent.
5. CBC owns curriculum meaning, evidence semantics, competency computation, and official CBC facts.
6. The reporting engine presents CBC progress and results but does not recalculate them.
7. Portfolio is the longitudinal learner-evidence report object.
8. Reporting scope comes from explicit URL state plus server-validated relationships, never from `returnTo`.
9. `returnTo` records origin only and must always be parsed by the canonical same-origin destination parser.
10. Every reporting drill-down preserves its parent's complete relevant state.
11. Every report page has a deterministic dynamic Back destination.
12. The active operating context selects the teaching or supervision projection.
13. Permissions and resource scopes are enforced by the backend on every report object and focused record.
14. Frontend guards improve presentation but never replace backend authorization.
15. Existing report URLs remain compatible until safely migrated.
16. The same facts produce the same result regardless of entry route.
17. The browser must not compute a competing reporting metric already owned by the server.
18. One reporting engine does not require one endpoint; projections may load independently and lazily.

## Canonical report objects

The catalogue recognizes exactly these workspace report objects:

- workspace;
- cohort;
- workspace subject;
- cohort subject;
- instructor;
- learner overview;
- learner subject;
- learner portfolio.

The URL is the source of truth for shareable report state. `academic_year`, `term`, the stable report object, `projection`, exact focus, search, status, sort, page, and a safe origin are carried directly. `returnTo` is deleted before a report URL is used as a new parent origin, preventing unbounded origin chains.

## Ownership boundary

Operational features express intent. Canonical report objects establish identity. Projections answer questions. Attendance, assessments, assignments, grading, CBC, portfolio, and export domain services own facts. `ReportingScope` owns visibility. The URL preserves report state. `returnTo` preserves origin.

## Term compute and reconciliation contract

Applicable curriculum engines are discovered from the backend registry. Each engine owns applicability, prerequisite validation, expected-scope discovery, mode-aware computation, obsolete-live-projection reconciliation, and completeness verification. The central orchestrator does not assume CBC, so generic-only, CBC-only, mixed, and future registered-engine terms run exactly the engines that apply.

- `INCREMENTAL` processes missing, dirty, and stale scopes and remains idempotent.
- `FULL_REBUILD` recomputes every expected live projection even when it appears current, reconciles obsolete rows, rebuilds summaries, and verifies completeness.
- `FINAL_RECONCILIATION` captures one evidence cutoff, gives it to every applicable engine, reconciles live projections, rebuilds summaries after engine work, and verifies every required family.

One atomic organization-and-term lock excludes all three modes. A worker crash is diagnosable through job age; after the configured stale threshold, a new request may atomically fail and replace the stale job. Different terms and workspaces remain independent.

CBC live rows that lose authoritative scope are retained but invalidated as stale. Generic mutable projections without a publication snapshot role are deleted when orphaned. Both policies are bounded to the organization and term. Neither path deletes source evidence or mutates published official snapshots.

Final preparation produces `READY_FOR_REVIEW`, `READY_FOR_PUBLICATION`, `BLOCKED`, or `FAILED` according to verified engine results and review prerequisites. It never publishes implicitly. Review and publication are separate user actions and permissions.

## Durable jobs and UI authority

Terminal job status, normalized result, counts, completion time, and released lock are committed before a terminal progress frame can be observed. SSE is an acceleration channel; the persisted job API is authoritative. After a terminal frame or stream loss, the client polls through any transient active snapshot, resumes from the job ID after reload, and stops only at a persisted terminal state or a bounded timeout.

Every result exposes top-level `counts`, per-engine results, blockers, evidence cutoff, readiness, and a truthful next action. Counts come from persisted job items and are never inferred from CBC-specific nested payloads.

Starting computation, preparing final projections, viewing compute jobs, routes, navigation, and controls require effective workspace-scoped `reports.compute`. `reports.view`, `reports.manage_policy`, `reports.review`, and `reports.publish` remain distinct.

Operational states are presented honestly: queued, queued too long, running, blocked, failed, stale, and completed. “Prepare Final Reports” means reconcile and verify live projections; only an explicit publication action may claim that reports were published.

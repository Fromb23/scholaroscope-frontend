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


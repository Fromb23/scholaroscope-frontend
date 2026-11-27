# Task-scoped documentation map

The only authoritative Operational Sustainability Doctrine is the backend
`../../schoolscope/server/ARCHITECTURE.md`. In a sibling checkout it is at
`../../schoolscope/server/ARCHITECTURE.md`; in a standalone checkout use the
[canonical backend source](https://github.com/Fromb23/schoolscope/blob/main/server/ARCHITECTURE.md).
Read that law first, then choose the affected rows below and inspect the
relevant request graph, implementation and tests. Follow discovered dependencies
without loading unrelated domain policy.

| Domain | Frontend starting points | Backend authority |
| --- | --- | --- |
| Identity, authentication and workspace authority | `frontend-workspace-state.md`, `platform-boundary.md`, `session-navigation-security.md` | `../../schoolscope/server/docs/PLATFORM_AUTHENTICATION.md`, `../../schoolscope/server/docs/WORKSPACE_AUTHORIZATION.md` |
| Academic setup and learner lifecycle | `../README.md`, affected academic API/hooks/components | `../../schoolscope/server/docs/term-setup-configuration-lock.md`, `../../schoolscope/server/docs/learner-lifecycle-events.md` |
| Curriculum extension architecture | `plugin-ui-boundaries.md`, affected plugin registry/surface | `../../schoolscope/server/PLUGIN_PROTOCOL.md`; curriculum-specific docs only when applicable |
| Lesson preparation and schemes of work | affected lesson/scheme API, hooks and components | owning backend services and invariant tests |
| Sessions and attendance | `session-navigation-security.md`, affected session/attendance hooks | `../../schoolscope/server/docs/attendance-risk-semantics.md`, `../../schoolscope/server/docs/event-scheduler-consistency.md` |
| Assignments and assessments | affected typed API, hooks, action surfaces and tests | owning backend services; CBC report policy only when applicable |
| Projects | `projects-institutional-registration.md`, project API/hooks/types/components | `../../schoolscope/server/docs/projects-architecture.md`, `../../schoolscope/server/docs/projects-reporting-infrastructure.md` |
| Evidence and academic projections | project/report hooks and curriculum extension surface | `../../schoolscope/server/docs/EVENT_SYSTEM.md`, applicable curriculum projection document |
| Reporting | `REPORTING_ENGINE_LAW.md`, `reporting-engine-route-map.md`, `desire-paths.md` | canonical reporting services and `../../schoolscope/server/docs/projects-reporting-infrastructure.md` |
| AI orchestration | `assistant-semantic-dictionary.md` | `../../schoolscope/server/docs/academic-intelligence-authority.md`, `../../schoolscope/server/docs/ASSISTANT_CONVERSATIONS.md`, then the affected capability document |
| Infrastructure and operational practices | `../README.md`, workspace/query architecture and tools | `../../schoolscope/server/docs/celery-architecture.md`, `../../schoolscope/server/docs/redis-dashboard-infrastructure.md` |
| Frontend architecture and API contracts | `../README.md`, `frontend-action-surfaces.md`, `error-architecture.md` | affected backend serializer/view/service and invariant tests |

The backend's own `../../schoolscope/server/docs/DOCUMENTATION_MAP.md` is the
complete server-side navigation map. When it is not a sibling checkout, use the
canonical backend repository link above and preserve the same relative path.

## Validation baseline

```text
npm run typecheck
npm run lint
npm run test -- --run <focused tests>
npm run check:architecture
npm run build
git diff --check
```

Run broader checks when the changed contract or architecture requires them.
Performance work records HTTP counts, payload size, synchronous and total work,
cache behaviour and result equivalence rather than reporting latency alone.

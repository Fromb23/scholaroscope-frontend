# System Boundaries Doctrine

## Purpose

Scholaroscope frontend code sits below backend domain law. It renders server
truth, keeps temporary interaction state, and explains failures safely. This
doctrine names the boundaries the frontend must respect so UI, state, data, and
errors do not contradict the backend or each other.

Backend domain law is canonical. The frontend may adapt backend decisions for
rendering, but it must not create final domain truth.

The shared chain is:

1. Backend domain law.
2. API contract.
3. Frontend server state.
4. Local UI and form state.
5. UI rendering.
6. Error explanation.

No boundary is universally authoritative. Each boundary protects one concern and
must not override another boundary outside that concern.

## Frontend State Hierarchy

State flows in this order:

1. Backend DB/domain state.
2. API response.
3. React Query server state.
4. Auth context / workspace context.
5. URL state for filters and navigation.
6. Local component/form state.
7. Visual UI state.

Rules:

- React Query owns fetched server state.
- Local component state owns only temporary inputs and UI toggles.
- `AuthContext` owns authenticated identity and active workspace context.
- URL state owns shareable navigation and filter state.
- UI must render backend state, not invent domain truth.
- Error state must come through `resolveAppError`.

## Boundary List

### 1. Platform Boundary

Owns:

- Platform and control-plane identity.
- Superadmin safety.
- Customer workspace separation.
- Public registration protection.
- Session-kind separation.

Must never decide:

- That platform identities may act through public customer workspace flows.
- That protected account types may be leaked publicly.
- Workspace resource ownership, product access, lifecycle state, or mutation
  authority.

Frontend alignment:

- Customer auth flows redirect platform identities to the configured platform
  console.
- Public copy must stay customer-safe and must not expose protected account
  internals.

### 2. Workspace / Tenant Boundary

Owns:

- Active organization context from backend auth/session payloads.
- Workspace isolation.
- Resource ownership as returned by APIs.
- Cross-organization data protection.

Must never decide:

- That a permission can access another workspace's data.
- Tenant ownership from route params, labels, or client cache alone.

Frontend alignment:

- `AuthContext` stores active workspace context.
- React Query keys must include workspace/filter identity when the data can vary
  by workspace or scope.

### 3. Governance Boundary

Owns:

- `SOLO_OWNER`, `MANAGED_TEAM`, and `INVITED_SUPPORT` behavior.
- Whether staff, roles, announcements, requests, and approvals apply.
- Not-applicable states for team workflows.

Must never decide:

- That permission can override backend `NOT_APPLICABLE` governance.
- That institution/team workflows should render as enabled in solo-owner
  workspaces.

Frontend alignment:

- Use backend governance and action metadata for display.
- Hide or explain not-applicable workflows; do not enable them.

### 4. Product / Plugin / Subscription Boundary

Owns:

- Plugin applicability.
- Entitlement.
- Installation.
- Enablement.
- Subscription-backed capability.

Must never decide:

- That route name or permission alone opens a product feature.
- That plugin availability can be inferred from local navigation.

Frontend alignment:

- Use backend product capability payloads and `hasProductCapability` /
  `hasFeatureAccess` only as render helpers.
- Backend still validates every product-backed mutation.

### 5. Academic Lifecycle Boundary

Owns:

- Current academic year.
- Active term.
- Upcoming term.
- Closure grace.
- Historical state.
- Read-only state.
- Cleanup windows.

Must never decide:

- That local dates or local UI toggles can make a closed/frozen/historical state
  writable.
- That permission overrides lifecycle read-only decisions.

Frontend alignment:

- Fetch lifecycle state from backend lifecycle endpoints or action metadata.
- Render read-only, blocked, cleanup, or historical states from backend payloads.

### 6. Authority Boundary

Owns:

- Permission keys.
- Role assignments.
- Scopes.
- Teaching assignment requirement.
- Action modes.

Must never decide:

- Final access from `ADMIN`, `INSTRUCTOR`, capability booleans, or page route
  alone.
- Product entitlement, governance applicability, lifecycle writeability, or
  tenant ownership.

`app/core/docs/AUTHORITY_HIERARCHY.md` is the frontend authority-boundary
contract. Authority is one boundary, not the whole system. UI, state, error, and
data boundaries must align with the backend contract and remain read-only when
backend metadata is missing.

### 7. Data Pipeline Boundary

Owns:

- Source endpoint.
- Query keys.
- DTO/API contract.
- Mutation endpoints.
- Invalidation keys.
- Backend-derived option lists.
- Cache ownership.

Must never decide:

- That UI may invent backend-owned options.
- That assignable staff can be derived from displayed assignments when a backend
  options endpoint exists.
- That current and historical data can be mixed unless explicitly requested.

Frontend alignment:

- API modules own endpoint calls and DTO mapping.
- Hooks own React Query keys, enabled conditions, and invalidation.
- Components consume hook results and should not create alternate API clients or
  cache owners.

### 8. State Boundary

Owns:

- React Query server state.
- Auth context state.
- Workspace context state.
- URL navigation/filter state.
- Local component/form state.
- Optimistic state, if explicitly designed.

Must never decide:

- That local form state is business truth.
- That stale client state overrides backend response.
- That temporary UI state should be persisted as domain truth.

Frontend alignment:

- React Query is the server-state cache.
- `AuthContext` owns identity and active organization.
- URL state owns shareable filters/navigation.
- `useState` owns only temporary controls, draft inputs, disclosure, loading
  affordances, and error display state.

### 9. UI / Rendering Boundary

Owns:

- Navigation.
- Layout.
- Theming.
- Empty states.
- Loading states.
- Disabled/read-only states.
- Action display.
- Request/approval affordances.

Must never decide:

- Mutation authority.
- Protected actions from `activeRole` alone.
- That backend `NOT_APPLICABLE` actions should render as enabled.

Frontend alignment:

- `activeRole` may select shell, layout, and broad navigation grouping.
- Protected buttons and forms must use backend permissions/action metadata or a
  documented read-only fallback adapter.

### 10. Error Boundary

Owns:

- User-facing explanation.
- Field errors.
- Banner, inline, toast, and page channels.
- Safe public copy.
- Support codes.
- Recovery actions.

Must never decide:

- New business law.
- That account/auth/platform errors are workspace-switch failures.
- That raw `error.response.data.detail` should be rendered when structured copy
  exists.
- That protected identity types can leak publicly.

Frontend alignment:

- Use `resolveAppError`, `errorCodeCopy`, field-error helpers, and the existing
  error primitives.
- Render `AppErrorBanner`, inline field errors, toast, or page states according
  to the resolved channel.

### 11. Testing / Invariant Boundary

Owns:

- Prevention of future regressions.
- Contract tests.
- Forbidden-pattern tests.
- Boundary integration tests.
- Impossible-state tests.

Must never decide:

- That happy-path UI tests are enough.
- That impossible states can be ignored.
- That source checks replace backend validation.

Frontend alignment:

- Add narrow tests for forbidden UI patterns, adapter fallback behavior, query
  key ownership, and structured error rendering where a regression would be
  costly.

## Frontend / Backend Relationship

The backend owns domain law, data ownership, lifecycle, entitlement, authority,
and structured boundary failures. The frontend owns rendering, local
interaction, state layering, and safe recovery copy.

Frontend code may render:

- Backend action metadata.
- Backend permission keys.
- Backend product capabilities.
- Backend governance payloads.
- Backend lifecycle payloads.
- Backend structured errors.

Frontend code must not create another authority system, error system, API
client, state manager, plugin entitlement system, or lifecycle system.

## Forbidden Patterns

- No raw `error.response.data.detail` rendering.
- No `activeRole`-only mutation decisions.
- No local date-only lifecycle mutation decisions.
- No deriving backend-owned options from displayed rows when an options endpoint
  exists.
- No hardcoded workspace-wide authority.
- No page-specific permission matrices.
- No plugin access based only on route names.
- No direct mutation without backend validation.
- No stale local/client cache overriding the latest backend response.

## Frontend Boundary Audit Snapshot

Audit date: 2026-07-11.

Shell/layout only:

- Existing `activeRole` checks in header, sidebar, nav configuration, and route
  shell helpers are acceptable when they select layout/navigation only.

Display-only summary:

- Capability booleans in dashboards, summaries, and role-aware copy are
  acceptable when they do not enable protected mutations.
- `error.message` is acceptable when it is already an `AppError.message`.

Protected action:

- Workspace-access role assignment now gets staff and scope options from
  `/workspace-access/assignment-options/`, filters scopes through backend
  `assignment_scope_policy`, and renders assignment option failures through
  `resolveAppError` and `AppErrorBanner`.
- Existing older pages still contain some `activeRole`, `capabilities.can_*`, and
  direct error-message patterns for protected actions. They are follow-up work,
  not part of this alignment pass.

Backend-owned server state:

- Workspace-access permissions, roles, assignments, assignment options, and
  current access state are owned by `workspaceAccessAPI` and
  `useWorkspaceAccess`.
- Academic lifecycle state is owned by backend academic endpoints and consumed
  as server state.

Temporary UI/form state:

- `useState` in workspace role assignment is temporary draft state for selected
  staff, role, scope, reason, confirmation, and inline errors. It is not domain
  truth.

Error boundary:

- Workspace-access assignment errors use `resolveAppError` and
  `AppErrorBanner`.
- Legacy plugin/request/session surfaces still contain direct transport-detail
  reads and should be normalized feature by feature.

Follow-up needed:

- Migrate older `/admin/instructors`, request, sessions, learner, and academic
  protected mutations away from raw role/capability decisions when backend
  action metadata is available.
- Normalize legacy raw transport-detail rendering to `resolveAppError` where
  structured copy exists.
- Expand query-key tests where data varies by active workspace or historical
  scope.

## Future Frontend Feature Checklist

Every frontend feature must declare:

1. Source endpoint.
2. Query key.
3. Mutation endpoint.
4. Invalidation keys.
5. Local state fields.
6. URL state fields.
7. Loading state.
8. Empty state.
9. Error state and error channel.
10. Read-only, blocked, and not-applicable state.
11. Backend action/capability fields used.
12. Tests for forbidden state.

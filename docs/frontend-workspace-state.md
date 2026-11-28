# Frontend workspace state

## Authority generation

`AuthProvider` owns authenticated workspace authority and advances the
monotonic runtime generation after a successful login/session restore,
workspace switch or restore, explicit logout, terminal session invalidation,
or a `me_context` replacement whose organization or membership version
changed. The generation is a stale-state boundary, not an authorization
decision; backend permissions remain canonical.

Every Axios request captures the current generation. Both successful and
failed responses are rejected when that capture no longer matches. Refresh
also checks the access-token version. `me_context` checks generation, token
version, and the expected active organization before committing membership,
role, capabilities, notices, or plugin-relevant authority.

The dashboard subtree is wrapped in `WorkspaceGenerationBoundary`. Advancing
the generation remounts the shell, page, plugin registry, providers, and
manual remote-data hooks. TanStack Query is cleared at the same commit. This
prevents old local state from remaining visible and prevents a late promise
from an unmounted workspace from overwriting the new one.

## State inventory

| Workspace data                                                      | Storage                                              | Identity/reset and stale-response rule                                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User, active organization, memberships, role, capabilities, notices | `AuthContext` state                                  | Auth transaction advances generation; `me_context` validates generation, token version, and expected organization.                                                 |
| Notifications and unread count                                      | `useNotifications` local state and refs              | Generation dependency clears list/count/baselines, replaces polling, and rejects late fetch/read mutations before sound, browser notification, or route rendering. |
| Sessions, lesson plans, assessments, learners, attendance, schemes  | Manual hook state                                    | Authenticated generation boundary remounts the hooks; Axios rejects old-generation responses.                                                                      |
| Assignments and selected academic setup data                        | TanStack Query                                       | Query cache is cleared at every committed authority change; organization-aware academic keys include organization ID where the query can be shared independently.  |
| Reports, exports, dashboards, instructor teaching load/history      | Manual hook/component state                          | Generation remount plus request rejection; export downloads are initiated only from the current mounted workspace.                                                 |
| Curricula, cohorts, subjects, terms, calendar events                | Mixed organization-keyed Query and manual hook state | Organization-keyed keys where present; all remaining stores reset at the generation boundary.                                                                      |
| Plugins and plugin registry                                         | Manual hook/provider state                           | Registry and installed-plugin state remount inside the generation boundary; capability context comes only from the new auth state.                                 |
| Announcements, profile, workspace access, subscriptions             | Manual hook or page state                            | Dashboard remount and request-generation rejection. Profile/capability state cannot survive account replacement.                                                   |
| Modal, dropdown, draft form, display preference state               | Local UI state                                       | Reset on component remount where inside the workspace shell; these values are not treated as remote authority.                                                     |

Assessment score mutations merge the authoritative score rows returned by the
backend into the existing assessment score store. They do not immediately
reload the unchanged list or assessment detail. Assessment reopen similarly
keeps the authoritative lifecycle response and reloads only scores and, when
applicable, the separately owned participation roster whose rows may have
changed. Workspace-generation rejection remains the stale-response boundary.

## Switch transaction

A switch request is made while the current workspace remains committed. If it
fails, no generation, token, context, cache, or manual store is changed. On
success, the server response supplies the new token and context; the provider
installs them synchronously, clears Query state, advances the generation, and
the keyed dashboard remounts. Concurrent or late switch/context responses
from the previous generation are rejected.

## Regression coverage

Mounted delayed-promise tests prove immediate notification reset, stale
notification side-effect suppression, generic manual-store remounting, late
`me_context` rejection, failed-switch consistency, and API-level rejection of
late successful responses. The workspace architecture checker requires the
generation anchors in the exact auth, API client, notification, and dashboard
boundary files.

## Explicit logout

The explicit-logout tombstone is stored in session storage and mirrored in
memory; it contains no token, user, or workspace data. Logout sets it before
advancing the workspace generation and clearing local authority. Server
revocation is bounded and best-effort, while local signed-out state is
authoritative. Automatic refresh and context paths cannot clear the tombstone
or restore a session. An intentional new authentication submission clears it.

Logout navigation uses the prefetched client router after the local transaction,
so the dashboard does not wait for a new document or an unrelated workspace
request. Server revocation continues independently with keepalive and a bounded
timeout. A safe failure category is observable, while the UI remains signed out
and makes no claim that server revocation succeeded.
## Operating contexts and Principal revocation

Operating contexts are backend authority projections, not role-title guesses.
The canonical contexts are `WORKSPACE_MANAGEMENT`, `MY_TEACHING`, and
`INSTITUTION_OVERSIGHT`. The latter is accepted only when present in the latest
capability response. Workspace switching or access-version refresh replaces the
context set, remounts the generation boundary, clears stale Principal navigation,
and redirects an inaccessible `/principal` route to another valid context or the
existing no-access surface. `activeRole` and legacy membership metadata never
authorize Principal UI.

## Project workspace navigation

Project list filters are URL state. Project, catalogue and portfolio source links carry a bounded internal `returnTo`; the project workspace sanitizes it with the shared application-destination parser. Tab changes modify the existing query string so `returnTo`, task, participant and other valid workspace state survive. Project source routes select the exact evaluation for authorized staff, while learner and parent portfolio detail never links into the staff workspace.

## Protected Principal and public identity boundaries

Principal is the protected, permission-bounded `OVERSIGHT` responsibility, not
workspace ownership, technical administration or teaching authority. Generic
role-management UI must not assign or end it. Principal tenure actions render
only from the protected backend lifecycle and exact capability. Principal
Academic Overview remains read-only, uses `INSTITUTION_OVERSIGHT`, clears
invalid academic descendants when a parent changes, and uses neutral canonical
report routes. A sanitized `returnTo` value is navigation only.
Role definitions, membership classifications, staff assignments and operating
contexts remain independent. Staff-role management identifies a member by
workspace membership identity; URL state never confers authority.

Password-reset request, validation and consumption are public identity flows.
They must not invoke authenticated refresh recovery, workspace generation,
membership state or organization headers. Valid, expired, used, superseded and
invalid token responses remain distinct; transport, CORS, timeout, server and
malformed-response failures are unavailable states, never invalid-token states.
Raw reset tokens and reset URLs must not enter logs, telemetry, monitoring
metadata or page titles.

## Shared academic reference queries

Academic years, current year, current term and subjects now use the existing
TanStack Query provider instead of component-local request state. Curricula and
academic lifecycle remain on the same provider. Stable catalogue lists use a
five-minute `staleTime`; current selections use one minute because their answer
is time dependent. Query keys include organization and normalized filters.
Actor-projected subjects additionally include actor, operating context,
workspace generation and projection identity.

The exported hook shapes remain compatible. Consumers can request only the
dataset they need; the CBC authoring surfaces no longer invoke the five-read
composite academic hook merely to obtain subjects. Two concurrent consumers of
the same academic-year identity issue one request, verified by the hook test.
Thus the representative duplicate-consumer graph changes from two HTTP reads to
one, while the subject-only authoring graph changes from five reference reads to
one. These are request-graph counts, not production latency measurements.

Successful year, term and curriculum mutations apply authoritative response
data where sufficient, then invalidate current context and dependent reference
keys. Subject mutations invalidate subject projections. Session, attendance,
assessment, score, participation and workspace-access mutations invalidate only
the dashboard families whose displayed values may change. Workspace generation
advance and logout retain the existing provider clear, abort and late-response
rejection behavior, so cached results cannot cross authority generations.

Academic-year rows are date-sensitive reference data. Their client stale window
is one minute, and the backend list cache includes the local calendar date, so
current eligibility changes at a date boundary without waiting for the
five-minute stable-catalogue cache.

Initial onboarding completion is backend-durable and independent of current
year availability. An established workspace between years remains operational
for authorized historical reads. Future-year planning uses explicit
`academic_year` and curriculum URL context across the year, term and cohort
surfaces; it never writes `is_current`. The backend still authorizes every
configuration mutation and every teaching or historical write independently.

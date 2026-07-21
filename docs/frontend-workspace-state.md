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

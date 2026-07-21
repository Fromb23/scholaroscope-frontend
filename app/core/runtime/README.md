# Runtime Boundary Test Plan

GAP-014 protects runtime transitions where static architecture checks are not enough.

Priority-0 coverage in this folder focuses on:

- tenant cache isolation during workspace switches
- late previous-workspace responses after a switch
- auth refresh races, failed refreshes, and local logout winning over refresh
- explicit-logout tombstones blocking boot, reconnect, and 401 refresh restoration
- membership-version mismatch signaling for workspace context reload
- permission/capability revocation removing protected navigation
- suspended or removed active workspace blocking protected children

Workspace-varying state belongs to the auth-owned monotonic workspace
generation. Login/session restoration, a committed workspace switch, logout,
session invalidation, and an authoritative context replacement advance that
generation. The API client tags requests with the generation at dispatch and
rejects responses from earlier generations. The authenticated dashboard is
keyed by the generation, so manual remote-data hooks remount and reset even
when their data is not stored in TanStack Query.

Notifications additionally clear their list, unread count, sound/browser
baseline, and polling interval at the boundary. A response from an earlier
generation cannot render a route, change unread state, play a sound, or create
a browser notification.

Explicit logout writes a non-secret session-storage tombstone before clearing
access authority or attempting server revocation. Boot refresh, reconnect,
context synchronization, and API 401 recovery all check the tombstone. A late
refresh cannot install a token after logout. Only an intentional login,
registration, or verification flow clears the tombstone; revocation failure or
offline state does not.

- plugin route safety while required plugins load or fail

These tests intentionally avoid styling, snapshots, broad page flows, and ordinary display components.

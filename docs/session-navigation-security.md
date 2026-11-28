# Session and navigation security

## Logout transaction

An explicit logout is locally authoritative:

1. set the non-secret explicit-logout tombstone;
2. clear the access token, authenticated context, workspace cache, and manual
   workspace state by advancing the workspace generation;
3. attempt the idempotent workspace logout endpoint with a bounded timeout;
4. let the root auth provider request one client replacement to `/login`
   regardless of network, abort, or revocation outcome;
5. confirm commitment from the mounted `/login` pathname, or issue one
   full-document `/login` replacement after a 1.5-second deadline.

Boot refresh, online reconnect, membership/context synchronization, timer or
401 recovery, and pending refresh results all check both the tombstone and the
token/workspace generation. They cannot restore the previous session. A user
can still sign in normally because submitting a new login is the explicit event
that clears the tombstone.

The workspace logout endpoint remains distinct from platform-control logout.
Its refresh cookie is HttpOnly and server-managed; the frontend never stores a
refresh token or claims revocation succeeded when the request fails.

The revocation fetch uses browser keepalive plus the existing 2.5-second bound,
so leaving the dashboard does not silently discard the server cookie-clearing
attempt. Failure reporting records only a safe outcome category; it does not log
credentials, tokens, cookies or raw responses.

The confirmed failure was navigation ownership, not backend revocation latency.
`Header` awaited the immediately resolved local-first logout promise and owned
`router.replace('/login')`, but logout advanced the workspace generation and
remounted the protected subtree containing `Header`. A login prefetch request
therefore did not establish route commitment, and the surviving dashboard shell
could remain in `Signing out...` indefinitely.

The owner now lives in `AuthProvider`, above that remount boundary. `Header`,
`AuthGuard`, and `DashboardClientShell` do not initiate competing explicit-logout
redirects. Guards render the protected-content-free signing-out state while the
root owner navigates directly to `/login`, without `next`. The owner cancels its
recovery timer only when `/login` commits, and resets `loggingOut` there so the
login form is not replaced by another pending state. A deliberate later login
also invalidates any old attempt before clearing the tombstone.

Mounted provider tests reproduce the generation unmount and cover successful,
rejected, aborted/timeout, and hanging revocation; delayed pre-logout context;
guard competition; stalled and committed navigation; repeated clicks; and later
intentional login. A production build is validated locally, but replay against a
deployed production browser remains pending because this repository has no
browser runner or production-session fixture.

## Destination parsing

`app/core/auth/navigation.ts` owns application destination parsing. Consumers
do not implement independent prefix checks. The parser inspects repeated percent
decoding for security, resolves against the current application origin, verifies
the resulting origin, and returns a normalized relative path/query/fragment.
Invalid destinations fall back to a fixed local route.

Report return trails are bounded. Ordinary drill-down construction removes a
carried `returnTo` before capturing the current route, so repeated navigation
cannot grow the query recursively. A small compatibility trail is accepted for
the existing class-report chain; deeper nesting is rejected.

Login `next`, report/assignment desire paths, learner flows, lesson plans,
schemes, curriculum/catalogue flows, and CBC/Cambridge routes use this contract.

## Protected deep links

The dashboard guard distinguishes session loading, unauthenticated,
authenticated-without-workspace, forbidden, and allowed states. Session loading
is the only open-ended resolver phase. Once unauthenticated is known, one
idempotent replacement to `/login?next=...` occurs. A valid session with no
workspace renders a stable recovery state, and an authenticated permission
denial renders a stable denial state; neither is rewritten through login or a
dashboard fallback. Sign-in consumes the validated `next` value and restores
the intended internal report URL.

## Verification

Behavioral tests cover failed/offline/aborted revocation, boot blocking,
intentional-login recovery, refresh races, internal navigation cases, schemes
and encoded/double-encoded attacks. The security-presentation architecture
checker rejects direct destination prefix validation and the retired raw error
extractor.

# Session and navigation security

## Logout transaction

An explicit logout is locally authoritative:

1. set the non-secret explicit-logout tombstone;
2. clear the access token, authenticated context, workspace cache, and manual
   workspace state by advancing the workspace generation;
3. attempt the idempotent workspace logout endpoint with a bounded timeout;
4. navigate to `/login` regardless of network, abort, or revocation outcome.

Boot refresh, online reconnect, membership/context synchronization, timer or
401 recovery, and pending refresh results all check both the tombstone and the
token/workspace generation. They cannot restore the previous session. A user
can still sign in normally because submitting a new login is the explicit event
that clears the tombstone.

The workspace logout endpoint remains distinct from platform-control logout.
Its refresh cookie is HttpOnly and server-managed; the frontend never stores a
refresh token or claims revocation succeeded when the request fails.

## Destination parsing

`app/core/auth/navigation.ts` owns application destination parsing. Consumers
do not implement independent prefix checks. The parser inspects repeated percent
decoding for security, resolves against the current application origin, verifies
the resulting origin, and returns a normalized relative path/query/fragment.
Invalid destinations fall back to a fixed local route.

Login `next`, report/assignment desire paths, learner flows, lesson plans,
schemes, curriculum/catalogue flows, and CBC/Cambridge routes use this contract.

## Verification

Behavioral tests cover failed/offline/aborted revocation, boot blocking,
intentional-login recovery, refresh races, internal navigation cases, schemes
and encoded/double-encoded attacks. The security-presentation architecture
checker rejects direct destination prefix validation and the retired raw error
extractor.

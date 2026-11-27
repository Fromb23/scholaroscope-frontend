# Scholaroscope frontend engineering entry point

Scholaroscope is a curriculum-agnostic teaching, academic-evidence,
institutional-visibility and educational-intelligence platform. CBC/CBE is the
current reference curriculum implementation, not the product identity or the
shared client architecture. The backend remains authoritative for permissions,
ownership, lifecycle, deadlines, evaluation state and projection eligibility.

## Required reading and discovery

Before implementation, read the authoritative Operational Sustainability
Doctrine in the backend repository at
`../schoolscope/server/ARCHITECTURE.md`. If the repositories are checked out
separately, use the canonical source at
`https://github.com/Fromb23/schoolscope/blob/main/server/ARCHITECTURE.md`.
Do not copy or maintain a frontend version of the doctrine.

Then read `README.md` and `docs/DOCUMENTATION_MAP.md`, identify the affected
domain, and follow only its mapped frontend and backend contracts plus genuine
dependencies discovered in the request graph. Apply the doctrine's decision
gate: audit, verify the gap and root cause, reuse the owning infrastructure,
make the smallest correct change, test, measure total work, and update the
owning documentation.

## Universal constraints

- Render backend-projected authority. Role titles, URL state, navigation state
  and client caches never authorize a business action.
- Keep organization and actor identity in query keys. Workspace-generation
  changes reset cached and manual remote state and reject stale responses.
- Follow component -> hook -> typed API adapter layering; keep route entries
  thin and do not create a parallel client state or reporting engine.
- Preserve plugin boundaries and curriculum neutrality. Curriculum-specific
  meaning stays inside the relevant extension surface.
- Consume authoritative mutation responses and invalidate only data that may
  have changed. Do not shift redundant work to the backend.
- The customer frontend never exposes the platform control plane. Public
  identity flows remain independent of authenticated workspace state.
- Preserve drafts by stable IDs, handle loading/empty/error/unsaved states, and
  never present internal finalisation as external KNEC submission.
- Change backend contracts and invariant tests first, then frontend types,
  adapters, hooks, components and regression tests.

Use the domain-specific validation listed in the documentation map. Never
bypass an architectural check or broaden the change into unrelated UI or
infrastructure work.

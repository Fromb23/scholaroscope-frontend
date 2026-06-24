# ScholaroScope Frontend

This frontend is not a marketing site and not a collection of isolated pages. It is the operator console for a multi-tenant school platform.

Its job is to let real users run school operations across organizations, roles, curricula, plugins, sessions, assessments, learners, reporting, and administrative controls without leaking backend complexity into the UI.

## What This System Is

At runtime, the frontend behaves as a single application shell with four constant dimensions:

- Organization-aware: every meaningful action happens inside an organization context, or from a superadmin view looking into one.
- Role-aware: superadmins, admins, and instructors do not see the same system, because they do not have the same authority or responsibilities.
- Curriculum-aware: kernel academic flows exist alongside curriculum-specific flows such as CBC and Cambridge.
- Plugin-aware: features are not all hardcoded into the core shell; some are mounted into it through registry and extension points.

This means the frontend should be understood as an operations surface over a governed system, not as a set of route files.

## Core Philosophy

The frontend follows these principles:

- Workflow first: model teacher, admin, and superadmin tasks first; route files are only entry points into those workflows.
- Backend contract first: the API owns system truth. The frontend should express, validate, and visualize that truth, not invent parallel business rules.
- Isolation where it matters: Cambridge, CBC, requests, announcements, and audit concerns can extend the shell without forcing everything into one generic model.
- Shared shell where it matters: authentication, navigation, organization context, session handling, and reporting still feel like one product.
- State should follow system boundaries: auth state, active organization, role, membership version, and plugin capability are first-class concerns.

## How The Frontend Thinks

When you work in this codebase, think in this order:

1. Who is the actor: superadmin, admin, instructor, invited user?
2. What organization context is active?
3. What domain is being operated on: academic setup, teaching, learners, assessments, requests, reports, plugins?
4. Is the behavior kernel-wide, or does it belong to a plugin boundary such as CBC or Cambridge?
5. What is the backend contract for this workflow?

If those questions are clear, the code usually becomes straightforward. If they are not clear, file-level edits tend to drift into bad abstractions.

## Runtime Shape

The frontend is effectively made of five cooperating layers:

- Application shell: authentication, organization switching, layout, navigation, route protection, and global UI state.
- Core domain client: typed API adapters, hooks, shared components, and shared types for kernel platform features.
- Plugin surfaces: CBC, Cambridge, requests, announcements, audit, and other mounted capabilities.
- Registry layer: the mechanism that lets plugins extend navigation, providers, routes, slots, and modal surfaces.
- Route entry points: Next.js pages that compose the above into actual user journeys.

Pages are the thinnest layer. They should not become the place where system behavior is invented.

## What Makes This Frontend Different

Several behaviors define the true nature of this client:

- Auth is contextual, not just token-based. The UI tracks user identity, memberships, active organization, and active role together.
- Organization membership can change underneath the browser. The client watches the backend membership version header and refreshes context when needed.
- Navigation is role-shaped and capability-shaped. Users do not simply get hidden links; they get different operating surfaces.
- Plugins are mounted into the same shell. CBC and Cambridge are not separate apps pretending to be one product.
- Sessions, assessments, learners, reports, and academic setup are cross-cutting workflows that may combine kernel and plugin data.

## Architecture Guidance For Contributors

When adding or changing features:

- Start from the workflow and API contract, not from the nearest route file.
- Keep kernel behavior in core only when it is genuinely shared across curricula and plugins.
- Put plugin-specific semantics inside the relevant plugin boundary.
- Do not duplicate backend invariants in several components. Centralize request shaping and typed contracts.
- Prefer typed API modules and hooks as the seam between UI and backend.
- Preserve organization scoping and role scoping in every new workflow.
- Treat registry extension points as part of the architecture, not as a workaround.

### Route File Rule

`app/**/page.tsx` must only import and render a page component.

Allowed:

```tsx
import { SubjectsPage } from '@/app/core/components/academic/subjects/SubjectsPage';

export default function Page() {
  return <SubjectsPage />;
}
```

Not allowed inside route files:

- local components
- hooks
- filtering
- form validation
- table columns
- API orchestration
- role/capability branching
- domain grouping helpers
- large JSX

Feature behavior belongs in `app/core/...` or `app/plugins/...`.
Domain logic belongs in hooks, lib modules, services, registries, or typed API modules.

## Loading State Rule

Loading states must describe the user-facing operation, not just show motion.

A loading state should not say “the app is busy.”
It should say “the app understood your exact intent and is working on that specific thing.”

Use:

- skeletons for known layouts
- button pending labels for mutations
- section loaders for partial content
- background refresh badges for refetches
- entity-specific labels when an entity is known
- staged states for reports/imports/exports/intelligence
- permission/context resolving states for auth, tenant, and capability checks

Avoid:

- generic “Loading...”
- full-page spinners for section data
- replacing existing content during refetch
- disabling buttons without saying what is happening
- spinner-only buttons
- showing empty states before loading has resolved

## What Not To Do

- Do not describe this app as “just a Next.js frontend”.
- Do not treat plugin features as one-off exceptions scattered through generic pages.
- Do not anchor architecture discussions on folder names alone.
- Do not move backend truth into client-only heuristics unless the UX explicitly needs local assistance.
- Do not make pages thick with data orchestration and business branching when hooks or domain modules should own that logic.

## Development

Requirements:

- Node.js 20+
- npm
- Running backend API, usually at `http://127.0.0.1:8000/api`

Environment:

- `NEXT_PUBLIC_API_URL` points the frontend at the backend API.
- `NEXT_PUBLIC_API_URL` must include `/api`, for example `https://backend.example.com/api`.
- Wrong: `https://frontend.example.com` or `https://frontend.example.com/api` unless `/api` on that host is proxied to Django.
- If unset, the client defaults to `http://127.0.0.1:8000/api`.

Useful commands:

```bash
npm install
npm run dev
npm run prepare
npx tsc --noEmit
npm run build
```

`npm run prepare` installs Husky hooks for local guardrails. `npm run build` is the production check and should pass before shipping.

## Mental Model For Reading The Codebase

Read the system by responsibility, not by directory:

- Shell and identity: auth, active org, role, layout, navigation.
- Operational domains: academic setup, sessions, learners, assessments, requests, reports.
- Plugin capability: CBC, Cambridge, announcements, audit, and other mounted concerns.
- Integration seams: API clients, hooks, shared types, registries, provider extensions.

If you keep that model in mind, the codebase reads as one governed product with modular curriculum surfaces, which is what it actually is.

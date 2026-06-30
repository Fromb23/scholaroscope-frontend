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

### Selective Plugin Loading Law

The academic core loads first. Curriculum and feature plugins load only when required by the active workspace, curriculum, route, or feature capability.

Plugin registration must be idempotent. Loading a plugin twice must not duplicate navigation entries, route access rules, slots, providers, or dashboard extensions.

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

## Error State Rule

Errors are product contracts, not decorative alerts. User-facing code must not
render raw exceptions, raw server messages, or vague fallback text.

Errors must explain:

1. what failed
2. why it likely failed
3. role/workspace/domain-aware recovery language
4. what the user can do next
5. whether retry is safe
6. who needs to act: teacher, admin, superadmin, or platform support

Use:

- `AppError` for structured error interpretation
- `errorCodeCopy` for stable backend business codes
- domain resolvers such as `resolveTeachingError`, `resolveLearnerError`, `resolveReportError`, and `resolveWorkspaceError`
- `AppErrorBanner` for action/page errors
- `ValidationErrorSummary` for field errors
- `PermissionErrorState` for access issues
- `NetworkErrorState` for connectivity issues
- domain-specific copy for reports, sessions, assignments, assessments, CBC, and Cambridge

Avoid:

- raw “Something went wrong”
- raw “Failed to fetch”
- raw backend exceptions
- displaying `err.message` directly
- displaying `extractErrorMessage()` directly in feature UI
- calling `resolveAppError()` directly from feature code when a domain resolver exists
- flattening field errors before forms can use them
- generic server error for lifecycle/setup/report-readiness problems

## Workspace Boundary Rule

Raw role is not product behavior. Workspace behavior and capabilities define product behavior.

Freelance owner-admin must not be treated as institution admin. A freelance owner-admin runs a teacher-owned, self-managed teaching workspace; institution admin means governance, supervision, and staff/member management.

Feature UI must use workspace/capability helpers instead of raw `ADMIN`, `PERSONAL`, or workspace behavior checks. Use helpers such as `isSelfManagedTeachingWorkspace`, `isSelfManagedTeachingAdmin`, `isTeachingActorView`, `canUseTeachingMode`, `canManageWorkspaceUsers`, `canShowStaffManagement`, and `canShowInstitutionGovernance`.

Raw workspace mode and organization-type checks are allowed only at API/type boundaries, onboarding selection, tests, and workspace policy/copy helpers.

## Error Placement Rule

A blocking form or page error must have one primary user-facing surface.

Do not render the same server/app error message in multiple banners, including one above a form and another inside a sticky footer. Field validation may appear inline and in a validation summary, but server/app errors should not duplicate.

## Form State Rule

Forms must never fail silently.

If frontend validation blocks submission, the form must:

1. show inline errors,
2. show a summary for long or multi-field forms,
3. focus or scroll to the first invalid field or validation summary,
4. preserve entered values,
5. clearly distinguish required and optional fields,
6. distinguish form validation errors from system state errors.

Blocking form validation should not auto-dismiss. Transient non-blocking feedback may auto-dismiss.

Use `FormValidationSummary`, `useFormValidationFeedback`, and the shared form error utilities for local field validation. Use `AppError` and domain resolvers for valid input blocked by workflow, permission, setup, workspace, report-readiness, or lifecycle state.

Field errors must remain attached to fields. State errors must stay in `AppErrorBanner`, `ErrorState`, or a domain-specific state component with recovery copy.

## Lesson Planning Rule

Lesson title is required for lesson plan generation and editing. Blank titles must block submission before API calls, show an inline field error, appear in the validation summary, preserve entered values, and focus or scroll to the first invalid field or summary.

## Assignment Workflow Law

Assignments are active teaching work until stored.
The UI must show the current stage and next safe action first.
Recipients, submissions, evaluations, groups, and evidence are internal workflow details and should be hidden behind progressive disclosure unless they are the current action.
Evidence bridging is automatic after review finalization.
Manual evidence bridge buttons should not be part of the normal teacher workflow.
Late-admitted learners are not missing evidence for assignments issued before they joined.
Attachment requirements are assignment slots, not only practical-lesson features.

## Lesson-Originated Assignment Memory Law

A learner task created from lesson preparation is active teaching work until stored, cancelled, or deleted. The dashboard must carry it visibly through preparation, issuing, response collection, review, evidence, and storage.

## Assignment Visibility Law

Open assignment workflow items must be visible on the teacher dashboard. They may be compact, but they must not disappear into a hidden assignment page or a sliced generic follow-up queue.

## Dashboard Memory Law

The dashboard is responsible for remembering unfinished teaching work. A teacher should not need to manually revisit assignment pages to know what remains open.

## Assignment Memory Law

Assignments remain dashboard-active while DRAFT, PUBLISHED, or CLOSED. They disappear only when stored, archived, deleted, or cancelled.

## Assessment Memory Law

DRAFT and ACTIVE assessments remain dashboard-active until FINALIZED. Finalized assessments leave the teacher's active work queue.

## Capability Boundary Law

Visible actions must use the same capability rule as the target page. Role opens the workspace; capability opens the action.

## Teaching Memory Law

Scholaroscope must carry unfinished teaching work for the teacher. Lessons, learner tasks, assignments, assessments, grading, and evidence records should produce action items until they are completed, stored, finalized, cancelled, or intentionally dismissed.

## No Empty Memory Card Law

The teaching dashboard is a memory surface, not a statistics wall. It should show unfinished teaching work, risks, blockers, and next actions. It should not show zero-count memory cards. If attendance risk, grading, learner support, alerts, assignments, or assessments have no actionable data, their cards should not render.

## Quiet Dashboard Law

When there is no active teaching work, the dashboard should become quiet and show workspace shortcuts. It should not fill the page with zero counts or empty review queues.

## Mobile Notification Law

Notifications must use a mobile-safe panel layout on small screens and a dropdown layout on desktop. The bell must not open a fixed-width desktop dropdown that overflows mobile viewports.

## Dashboard Single Action Law

The dashboard must show one primary next action first. Supporting widgets may provide context, but they must not repeat the same primary action for the same object.

## Stage Orientation Law

Assignment and assessment pages must show the current stage, progress position, and one primary next safe action before exposing secondary actions.

## More Actions Law

Secondary and corrective actions must be hidden behind More on both desktop and mobile so the teacher is not forced to understand the whole lifecycle at once.

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

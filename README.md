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

## System Navigation & Filter Laws

### Desire Path Law

A desire path is the route a user would naturally take from the entity they are looking at to that entity's next useful view, without backing out to a top-level index and rebuilding context. When a component renders a learner, instructor, class, or subject name inside a working context that already has the IDs needed for a report or profile link, it should offer one primary context-carrying link built through the shared `build*Href` helpers.

Every desire path must preserve state with `returnTo`, so the user comes back to the same working URL with filters intact. Report targets must be role-gated through the existing report access predicates such as `resolveReportSurface`, `canRenderInstitutionReportOverview`, and `shouldUseInstructorReportSurface`; do not invent local permission checks for report links.

This law is deliberately scope-limited. Do not fabricate missing IDs, do not add competing links to every cell, and do not add navigation inside transient forms or modals where leaving the page would discard in-progress work. New features must adopt desire paths where the entity name and required context already co-exist.

Current desire-path baseline:

- `app/core/components/academic/cohorts/CohortStudentsPage.tsx`: class learner profile helper still carries an implicit class return path; migrate to explicit `returnTo` when learner profile navigation is consolidated.
- `app/core/components/academic/cohortSubjects/CohortSubjectLearnersPage.tsx`: admin enrolment-management branch still uses subject-anchor profile navigation; instructor report navigation is handled separately.
- Lesson-plan to originating-scheme navigation is backend-dependent when the lesson plan payload does not expose a scheme id. The current frontend renders the path only when `generated_context.scheme_id` or `generated_context.scheme` is present.
- Assignment learner report links use the assignment payload fields currently available (`cohort_subject`, `cohort_id`, `subject_id`) and must add `term` when the assignment payload exposes it.

`npm run check:desire-paths` guards new learner/instructor report and profile href calls so they do not omit `returnTo`. A shared `NavLink` abstraction is intentionally deferred.

### Hierarchy Filter Law

When a filter bar exposes two or more hierarchy levels, those levels render parent-to-child:

Academic Year -> Term -> Cohort/Class -> Subject/Class subject -> Instructor -> Learner -> Assessment.

Non-hierarchy filters such as search, status, assessment category, and view-mode controls keep their local product position. Single-level filter bars are exempt. Changing a parent filter must preserve child selections through the existing preserve-and-mutate `updateQuery` pattern; invalid child scopes are handled by existing access or empty states, not by clearing URL state. Do not add hierarchy levels to pages that do not already expose them.

Current hierarchy-filter baseline:

- `app/core/components/lessonPlans/LessonPlansPage.tsx`: Subject/Class subject is ordered before Cohort; correcting it requires grouping-mode rework.
- `app/plugins/schemes/components/SchemesPage.tsx`: mirrors the lesson-plan ordering and should be fixed alongside it.

`npm run check:hierarchy-filters` guards the ordering of existing hierarchy filters. A shared `FilterBar` abstraction is intentionally deferred.

### Selective Plugin Loading Law

The academic core loads first. Curriculum and feature plugins load only when required by the active workspace, curriculum, route, or feature capability.

Plugin registration must be idempotent. Loading a plugin twice must not duplicate navigation entries, route access rules, slots, providers, or dashboard extensions.

### Logout Session Revocation Law

Frontend logout is local-first: clear local auth state, query cache, and navigation state immediately, then attempt backend session revocation in the background.

Backend logout must clear the HttpOnly refresh cookie and revoke the Redis refresh session. Missing, invalid, or failed revocation must not trap the browser in a session; the browser should still receive a cleared refresh cookie. After backend logout, refresh must be treated as unauthenticated.

### GitHub Release Version Law

The sidebar displays the version of the deployed build, not the latest GitHub release. Latest release can differ from the artifact currently running, so client code must not fetch GitHub latest release directly.

Deployment should inject public build metadata at build time:

- `NEXT_PUBLIC_APP_VERSION`: GitHub release tag or deployment ref, for example `${{ github.event.release.tag_name || github.ref_name }}`
- `NEXT_PUBLIC_GIT_SHA`: commit SHA, for example `${{ github.sha }}`
- `NEXT_PUBLIC_RELEASE_CHANNEL`: release channel such as `production`
- `NEXT_PUBLIC_BUILD_TIME`: UTC build timestamp generated by CI or the hosting platform

If `NEXT_PUBLIC_APP_VERSION` is absent, the sidebar falls back to `dev`. The release badge handles tags with or without a leading `v`.

### Server Shell / Client Island Law

Scholaroscope uses Server Components for static, read-only, or shell-level UI where safe. Components become Client Components only when they need browser interaction, React state/effects, React Query, forms, modals, live workflow memory, or route interaction.

Large route layouts and read-only pages should remain server-renderable when possible. Put browser-dependent behavior behind explicit client islands such as `*Client.tsx` or `*ClientShell.tsx`.

Report Client Island Law:

Report pages should expose a server-renderable shell and place data fetching, filters, modals, exports, and mutations inside explicit client islands. This allows report routes to benefit from Next.js server boundaries without breaking protected interactive report workflows.

Report Maintainability Law:

Report route wrappers stay server-renderable. Client-heavy report internals are split gradually into server shells, client islands, and smaller presentation sections. Large report files must not keep growing without extraction; `npm run check:report-size` guards the current baseline and documents remaining debt.

Dashboard Exception:

The main teaching dashboard may remain client-heavy because it is a live workflow surface. Optimization should focus first on read-only reports, policy previews, public/static pages, and plugin loading.

Phase 6 boundary audit classification:

- Must remain client: `app/context/AuthContext.tsx`, `app/context/SidebarContext.tsx`, `app/plugins/PluginRegistryProvider.tsx`, `app/components/layout/Header.tsx`, `app/components/layout/Sidebar.tsx`, `app/components/layout/NotificationBell.tsx`, assignment workflow components, assessment marking workflows, attendance/session recording screens, dashboard memory surfaces, and plugin hook/provider files.
- Split into server shell plus client island: `app/(dashboard)/layout.tsx` now renders the explicit `app/(dashboard)/DashboardClientShell.tsx` island that owns auth redirects, workspace refresh, capability route protection, plugin loading, sidebar/header state, and notices.
- Split report internals: `ReportsPage`, `ReportPoliciesHubPage`, and `GradePoliciesPage` are server shells over `ReportsPageClient`, `ReportPoliciesHubPageClient`, and `GradePoliciesPageClient`.
- Can be server shells: `app/(dashboard)/reports/**/page.tsx` route wrappers and existing CBC report-policy route wrappers. These files should import and render the relevant report client island without adding hooks or event handlers.
- Needs later review: client-heavy report internals such as `GradePolicyDetailPage`, `CbcReportPolicyDetailPage`, `CbcAssessmentPolicyPreview`, attendance reports, learner reports, subject reports, and teacher performance reports; curriculum browser/progress pages; public landing/auth pages. These depend on auth hooks, React Query, route params, exports, modals, URL mutation, or live policy lookups and should only be split after their data and interaction boundaries are clear.

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

## Error Channel Law

Errors are routed by user-impact channel:

- `toast`: timing, background, and non-blocking failures
- `inline`: field-level and form-level validation near the affected control
- `banner`: action-level recoverable failures
- `page`: route-level blocking failures

`AppError` classification and display channel are related but not identical. The same classification may render differently depending on action context: a retryable network error during a blocking page load can be a page state, while a background sync failure should be a toast.

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

## Mobile Shell Law

Responsive layout must not depend on post-hydration JavaScript width detection for first paint. Use CSS and Tailwind responsive classes for layout selection: mobile drawer below the desktop breakpoint, optional tablet rail later, and full sidebar at desktop sizes. JavaScript state may open or close interactive drawers, but it must not decide whether the first render is mobile.

The root layout exports explicit viewport metadata with `width: 'device-width'` and `initialScale: 1`. Do not disable accessibility zoom without a strong product reason.

## User-Flow Integration Test Foundation

Current coverage is mostly unit and source-level architecture tests. Lightweight integration flow coverage should grow around user outcomes before adding a browser runner.

Existing foundation:

- logout local-first behavior clears local auth state before backend revocation resolves
- boot-time refresh results are ignored after logout changes local auth state
- backend refresh-auth invariants cover logout cookie clearing and refresh denial after logout

Future E2E candidates:

- login -> dashboard
- create assignment -> dashboard memory
- publish assignment -> still dashboard memory
- store assignment -> removed from dashboard
- create assessment -> active memory
- finalize assessment -> removed from active memory
- logout -> refresh cannot restore session

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

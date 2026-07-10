# Customer Platform Boundary

`scholaroscope-frontend` serves `scholaroscope.com`. It is the public and workspace application for visitors, workspace owners, workspace administrators, instructors, and workspace members.

The platform control plane is separate:

- repository: `superadmin-scholaroscope`
- domain: `admin.scholaroscope.com`
- API namespace: `/api/platform/**`
- auth cookie: `scholaroscope_admin_refresh`

## Customer App Rules

- No `/superadmin` route tree.
- No `/dashboard/superadmin` route.
- No platform navigation or platform dashboard components.
- No platform user, organization, audit, health, plugin-entitlement, subscription-plan, or control-plane API clients.
- `User.is_superadmin` may be read only to redirect platform operators to `NEXT_PUBLIC_PLATFORM_APP_URL`.
- Workspace role UI remains available to workspace administrators.
- Commercial onboarding remains backed by `apps.subscriptions` catalogue and quote endpoints.

## Redirect Behavior

When workspace auth boot or login resolves a platform operator, the customer app clears local workspace auth state and sends the browser to:

```text
NEXT_PUBLIC_PLATFORM_APP_URL/login
```

The customer login page also handles the backend `platform_login_required` error and displays a single action to open the platform console.

The backend response must not be treated as the source of the platform console URL.
The UI uses `NEXT_PUBLIC_PLATFORM_APP_URL` for the button destination and never
renders backend-provided `admin_url`, internal hostnames, cookie names, Redis
prefixes, serializer context, or arbitrary backend context fields.

Platform-login-required copy:

```text
Platform administrators sign in through the Scholaroscope control plane.
```

Primary action:

```text
Open platform console
```

## Structural Guard

Run:

```bash
npm run check:platform-boundary
```

The guard rejects prohibited platform route paths and symbols while allowing the legitimate `user.is_superadmin` redirect boundary.

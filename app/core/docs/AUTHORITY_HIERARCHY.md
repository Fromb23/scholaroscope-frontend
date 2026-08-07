# Authority Hierarchy

Backend authority is canonical. The frontend renders the server contract; it does not decide final mutation authority.

## Frontend Contract

Scholaroscope resolves workspace authority through active membership, workspace role assignments, named permissions, effective scopes, target resources, domain relationships/responsibilities, governance, lifecycle, and entitlement. Frontend code renders that server contract; it must not infer authority from legacy persona labels.

## Rendering Rules

- `activeOperatingContext` selects the presentation/workflow family, such as workspace management or my teaching.
- `activeOperatingContext` does not grant actions, routes, or menu items inside that family.
- Every protected route and navigation item must require backend-derived capability or named permission for its target surface.
- Permission keys and backend action metadata drive action buttons, forms, mutations, destructive commands, routing, and protected navigation.
- Capability booleans are display hints and summaries.
- Product entitlement and lifecycle are not guessed locally.
- Missing backend action metadata must render read-only or blocked fallback state.
- No page-level role hacks for protected actions, routes, or navigation.

## Backend Decision Inputs

Frontend rendering may consume:

- backend action metadata such as `allowed`, `action_mode`, `reason_code`, and `message`;
- `capabilities.authorization.permission_keys`;
- `product_capabilities` or `effective_capabilities`;
- `workspace_governance`;
- lifecycle payloads where an endpoint returns them.

These inputs are render hints only. The backend still enforces the action when the request is submitted.

## Action Modes

Render the server action mode:

- `DIRECT`: show and enable the action.
- `REQUEST_APPROVAL`: show the request path.
- `READ_ONLY`: show read-only state and disable mutation.
- `NOT_APPLICABLE`: hide or show a not-applicable/upgrade state depending on page context.
- `BLOCKED`: show blocked state with the backend reason.

## Legacy Roles

`activeRole`, `ADMIN`, and `INSTRUCTOR` are compatibility projections only. They must not control production routing, navigation, authorization, resource visibility, workflow mode, or privileged recovery guidance.

`OrganizationMembership.role` values `ADMIN` and `INSTRUCTOR` have no workspace authority semantics. Institution workspace administrators do not teach by administrator authority. Teacher responsibility is separate from actual teaching assignment and does not grant global teaching access.

`SUPERADMIN` remains separate as the platform/control-plane boundary. It does not implicitly receive workspace authority.

Staff, teacher, role, and teaching assignment are separate concepts:

- Staff: a person in the institution workspace.
- Teacher/instructor: a teaching identity.
- Role: delegated permissions.
- Teaching assignment: academic teaching scope.

## Future Feature Checklist

Every new feature must declare:

1. Workspace governance applicability.
2. Required product/plugin entitlement.
3. Required lifecycle mode.
4. Required permission key.
5. Required scope type.
6. Required teaching assignment or relationship.
7. Action resolution modes: `DIRECT`, `REQUEST_APPROVAL`, `READ_ONLY`, `NOT_APPLICABLE`, `BLOCKED`.
8. Backend domain error codes.
9. Frontend render state.
10. Tests proving the feature cannot bypass the hierarchy.

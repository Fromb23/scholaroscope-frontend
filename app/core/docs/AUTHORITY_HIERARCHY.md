# Authority Hierarchy

Backend authority is canonical. The frontend renders the server contract; it does not decide final mutation authority.

## Frontend Problem

Scholaroscope still has legacy shell roles (`ADMIN` and `INSTRUCTOR`) while the backend now resolves action authority through governance, entitlement, lifecycle, membership, permission keys, scopes, and teaching assignments. UI code becomes unsafe when a page enables a protected action because `activeRole === 'ADMIN'`, `activeRole === 'INSTRUCTOR'`, or a capability boolean is true.

## Rendering Rules

- `activeRole` may choose shell, layout, navigation, and broad page grouping.
- `activeRole` must not grant protected mutation authority.
- Permission keys and backend action metadata drive action buttons, forms, mutations, and destructive commands.
- Capability booleans are display hints and summaries.
- Product entitlement and lifecycle are not guessed locally.
- Missing backend action metadata must render read-only or blocked fallback state.
- No page-level role hacks for protected actions.

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

`ADMIN` and `INSTRUCTOR` are legacy membership lanes and shell compatibility values. Institution admins do not teach by admin authority. Teacher role assignment is not a teaching assignment and does not grant global teaching access.

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

# Desire Paths

Scholaroscope routes should preserve the user journey when a workflow moves from
one entity to another and back.

## Rules

- Preserve list filters, tabs, searches, and source routes with `returnTo` when the
  user leaves a working context.
- Use existing shared route helpers for learner, class, subject, instructor, and
  report links.
- Do not create open redirects. Platform console redirects use the fixed frontend
  environment URL and do not reuse arbitrary `next` or backend URL fields.
- Commercial quote selection should survive registration navigation through the
  backend quote token.
- Authenticated additional-workspace creation routes through `/workspaces/new` and
  carries commercial state to registration/provisioning only through the quote
  contract.

## Guard

Run:

```bash
npm run check:desire-paths
```

The guard keeps new entity-profile/report links from dropping `returnTo`.

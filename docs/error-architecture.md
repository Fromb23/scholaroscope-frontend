# Error Architecture

Error handling is split into normalization and presentation. Backend envelopes may
carry structured data for code decisions, but UI surfaces render only safe,
context-specific copy.

## Login Screens

Customer login screens must not display backend environment URLs, `admin_url`,
`localhost`, API hostnames, cookie names, Redis prefixes, stack traces, serializer
context, arbitrary backend context, raw Axios messages, or full backend response
objects.

Controlled messages:

- platform-login-required: `Platform administrators sign in through the Scholaroscope control plane.`
- invalid credentials: `Email or password is incorrect.`
- network/service failure: `Scholaroscope could not be reached. Try again.`

The platform console action destination comes from `NEXT_PUBLIC_PLATFORM_APP_URL`.
If a backend compatibility payload still contains `admin_url`, rendering ignores it.

## Field Errors

Field error extraction is allowlisted. Known customer-safe fields may be rendered
with friendly labels; arbitrary backend context keys are dropped.

Do not iterate through every backend object key and humanize it as validation copy.

## Tests

Keep tests proving `admin_url`, `localhost`, arbitrary context keys, and raw
technical transport messages do not reach auth presentation.

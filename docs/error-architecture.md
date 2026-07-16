# Error Architecture

Error handling is split into normalization and presentation. Backend envelopes may
carry structured data for code decisions, but UI surfaces render only safe,
context-specific copy.

`resolveAppError` is the canonical presentation boundary. It selects stable copy
from the error-code registry, status classification, and a narrow set of known
framework messages. `resolveErrorMessage` is the compatibility adapter for old
string-only UI state and delegates to that same resolver. The former
`extractErrorMessage` helper has been removed from production because flattening
arbitrary response objects is not a safe presentation contract.

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
with friendly labels; arbitrary backend context keys are dropped. Field strings
are screened for exception, SQL, HTML, path, URL, token, and cookie patterns
before display.

Do not iterate through every backend object key and humanize it as validation copy.

## Suppressed content

Unknown `detail`, `message`, array, or nested object values never become product
copy merely because the server returned them. Stack traces, exception names,
database text, filesystem paths, internal URLs and hosts, HTML, bearer values,
cookies, and serialized objects resolve to stable domain/status fallback copy.
Support codes use only the dedicated structured field and a bounded character
set. CBC errors no longer expose backend diagnostic payloads in the rendered UI.

## Tests

Keep tests proving `admin_url`, `localhost`, arbitrary context keys, and raw
technical transport messages do not reach auth presentation.

`npm run check:security-presentation` rejects the retired helper and obvious raw
response rendering. `npm run check:errors` retains the domain-copy guardrails.
Regression tests cover SQL, stacks, paths, HTML, tokens/cookies, nested values,
authorization, network failure, and allowlisted validation fields.

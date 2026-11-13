# Scholaroscope intellectual property provenance

This document records repository evidence for identifying software that
existed before the MEST AI Startup Program start date of 18 January 2027. It is
an engineering provenance record, not a legal opinion or proof of exclusive
copyright ownership.

## Repositories

- Backend: `Fromb23/schoolscope`
  (`https://github.com/Fromb23/schoolscope`)
- Frontend: `Fromb23/scholaroscope-frontend`
  (`https://github.com/Fromb23/scholaroscope-frontend`)
- Project name: Scholaroscope (also styled `ScholaroScope` and historically
  `SchoolScope` in repository material)

## Earliest verifiable history

| Evidence | Repository and commit | Authored date |
|---|---|---|
| Backend repository root commit | `schoolscope` — `8c6ae1042219b3de2bf7f47073882db8fbc894a4` | 15 January 2026, `+03:00` |
| Earliest frontend source found in the original monorepo | `schoolscope` — `035ff0a32796912488f5b645186a9049023bef40` | 20 January 2026, `+03:00` |
| Explicit GPL-3.0-or-later adoption | `schoolscope` — `72d30223be61f12dcf4ef44a6c18f0ed09ca5022` | 1 March 2026, `+03:00` |
| Separate frontend repository root commit | `scholaroscope-frontend` — `d9a815ec2b4f83e437191246824a448ff2b51751` | 15 March 2026, `+03:00` |

These are the earliest dates verifiable from the available Git objects, not a
claim that development began on those dates. Author and committer timestamps
can be configured by Git and should be corroborated with hosting records,
backups, releases, communications, or contracts when stronger proof is needed.
The cited commits nevertheless record substantial backend and frontend work
well before 18 January 2027.

## Extraction from the monorepo

The frontend first lived under `frontend/` in the `schoolscope` repository. The
last monorepo frontend commit before extraction was
`407bc124b9aba79e6430a2b42094aa6959ac47a1` on 15 March 2026. The separate
repository begins with snapshot commit
`d9a815ec2b4f83e437191246824a448ff2b51751`, whose subject explicitly says it was
extracted from the schoolscope monorepo. The monorepo directory was removed by
`93c58593a73e1e784d524e63601e445bfdfae8e7` and later cleanup commit
`e63bbfeeea3691ce66dbc1448b3d2fd6131f28c5`.

The initial snapshot has no Git parent connecting it to the monorepo. The
original repository therefore remains necessary provenance for frontend work
created between 20 January and 15 March 2026.

## Pre-existing software

Before 18 January 2027, the repositories recorded a multi-tenant education
platform with:

- a Django backend governing identity, workspace permissions, academic
  structures, learners, sessions, assessments, assignments, projects,
  reporting, curriculum evidence, projections, plugins, and asynchronous work;
- a Next.js and TypeScript frontend providing workspace-aware API adapters,
  hooks, permissions, academic hierarchy navigation, teacher workflows,
  reporting, Principal oversight, and plugin user interfaces; and
- automated architecture checks for client boundaries, workspace scoping,
  errors, forms, loading states, report surfaces, plugin loading, navigation,
  and assignment workflows.

This description concerns internal Scholaroscope software. Internal
finalization is not submission of KNEC marks or any government system.

## Authorship and ownership limitations

The human Git author names are the Francis Rombo and `Fromb23` identities listed
in [COPYRIGHT.md](./COPYRIGHT.md). Git metadata supports recorded authorship but
does not conclusively establish legal identity, employment status, assignments,
or the origin of every line. The audit found no contributor licence agreement
or copyright assignment. A Copilot bot merge is separately identified in the
copyright record.

Dependencies, framework scaffold files, generated files, third-party assets,
and AI-assisted or copied material remain subject to their own rights. They are
not converted into Scholaroscope property by inclusion here. Any employer,
contractor, educational institution, trademark, or tool terms that applied when
work was created require separate factual and legal review.

## Historical licence declarations

- The backend root initially contained Apache-2.0.
- Backend commit `72d30223be61f12dcf4ef44a6c18f0ed09ca5022` explicitly recorded adoption of
  GPL version 3 or later before the frontend was extracted, but left the old
  Apache root file in place.
- The frontend extraction commit contained no root licence and no package
  licence field.
- Commit `7029417b639c94b326f268935a4b5d92593cd910`, dated 26 April 2026, added
  `"license": "ISC"` with generic package boilerplate during an unrelated UI
  refactor, without adding an ISC licence file.

The November 2026 audit resolved current documentation in favor of
GPL-3.0-or-later, following the explicit pre-extraction decision and preserving
the project's open-source direction. This correction does not revoke any valid
licence previously received for an earlier copy, establish ownership, or erase
third-party rights. Questions about the legal effect or scope of historical
Apache or ISC declarations should be reviewed by qualified counsel.

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for dependency and
scaffold details.

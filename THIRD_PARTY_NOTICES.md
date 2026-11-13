# Third-party notices

Scholaroscope uses third-party packages, framework scaffold material, and
assets. Those materials retain their own copyright, trademark, and licence
terms. GPL-3.0-or-later for Scholaroscope's original source does not replace
those terms or make dependencies Scholaroscope property.

This is a focused provenance summary, not a replacement for licence files in
resolved npm packages. Exact notices should be generated from the resolved
package tree before distributing a bundled desktop application, container, or
other artifact that includes dependency code.

## Direct runtime dependencies

The audit read exact versions and declared licences from `package-lock.json`:

| Component | Resolved version | Declared licence |
|---|---:|---|
| `@sentry/nextjs` | 10.40.0 | MIT |
| `@tanstack/react-query` | 5.91.3 | MIT |
| `axios` | 1.13.2 | MIT |
| `eslint-plugin-prettier` | 5.5.5 | MIT |
| `lucide-react` | 0.562.0 | ISC |
| `next` | 16.1.3 | MIT |
| `react` | 19.2.3 | MIT |
| `react-dom` | 19.2.3 | MIT |

## Direct development dependencies

The direct development packages are predominantly MIT-licensed, including
Tailwind CSS, ESLint, Prettier, Husky, lint-staged, Vitest, React test renderer,
and the installed `@types/*` packages. `typescript` 5.9.3 declares
Apache-2.0. These tools and packages do not automatically determine the licence
of original Scholaroscope source, but distributions that include their code or
assets must comply with their terms.

Transitive dependencies remain governed by the declarations recorded in
`package-lock.json` and their distributed licence files. In particular, the
resolved Next.js image stack includes platform-specific `@img/sharp-libvips-*`
packages declaring LGPL-3.0-or-later; distributions that bundle those binaries
must preserve the applicable notices and satisfy the corresponding licence
terms.

## Framework scaffold and assets

The initial frontend snapshot describes the project as bootstrapped with Create
Next App and includes standard SVG files under `public/`, including Next.js and
Vercel branding. Next.js is distributed under MIT, but names and logos may also
be protected by trademark or branding rules. Retain upstream notices and do not
represent those marks as owned by Scholaroscope. Remove unused scaffold assets
from distributable branding surfaces if their inclusion is unnecessary.

## Generated material

`package-lock.json` and build outputs are generated or mechanically derived in
whole or in part. Generator licences do not ordinarily set the licence of
original project input, but embedded third-party code and notices retain their
own terms.

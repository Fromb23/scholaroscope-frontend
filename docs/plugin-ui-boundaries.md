# Plugin UI Boundaries

Core owns application shells, route gates, layout regions, navigation containers, and shared workflow surfaces. Plugin UI enters those surfaces only through declared extension points.

## Extension Points

Use the established registries for plugin-owned UI:

- Plugin manifest for loading metadata and route-required plugin selection.
- Navigation registry for sidebar and mobile navigation entries.
- Route registry and route-access registry for plugin route rules.
- Slot registry for shared workflow regions.
- Provider registry for plugin context providers.
- Domain-action registries for workflow actions such as teaching-session routes.
- Policy-surface registries for report and assessment policy UI.
- Settings extension slots for plugin-owned settings panels such as `admin.settings.appearance`.

Plugin-owned routes may freely compose their own internal components after the plugin has loaded through its manifest.

## Entitlement Loading

The frontend consumes backend-resolved `product_capabilities` or `effective_capabilities`. It does not decide whether a capability is platform-default, workspace-standard, premium, metered, or an external integration.

An explicit backend capability result is authoritative. When a plugin key is present with `enabled: false`, plugin loading must not be re-enabled by installed plugin keys, route matches, workspace role, or workspace type.

During migration, plugin loading may fall back to active installed plugin keys, route-required plugin IDs, and curriculum type signals only when the backend omitted that specific capability key. A missing capability key is compatibility data; a disabled capability key is a denial.

Route matching is not entitlement, and installation is not entitlement. Both are frontend loading hints only when backend capability data is absent. Backend plugin endpoints must independently verify workspace capability/entitlement and user role/resource permission.

## Theme Boundary

The core shell may consume the resolved theme contract through the existing theme contexts and API client because theme data is needed before plugin registration finishes.

Theme configuration UI is plugin-owned. The themes plugin registers settings panels through declared settings extension slots, and core settings pages render those slots without importing theme plugin components directly.

## Boundary Guard

Run:

```bash
npm run check:plugin-boundaries
```

The guard blocks new direct imports from core-owned app surfaces into plugin UI implementation files. Existing direct route-shell imports are captured in `tools/plugin-ui-boundary-baseline.json` and should be removed as routes move behind declared plugin registries.

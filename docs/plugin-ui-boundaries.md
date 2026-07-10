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

Plugin-owned routes may freely compose their own internal components after the plugin has loaded through its manifest.

## Entitlement Loading

The frontend consumes backend-resolved `product_capabilities` or `effective_capabilities`. It does not decide whether a capability is platform-default, workspace-standard, premium, metered, or an external integration.

During migration, plugin loading may fall back to active installed plugin keys, route-required plugin IDs, curriculum type signals, and existing superadmin exceptions. The resolved capability result is the preferred authority for loading.

Frontend gating is UX only. Backend plugin endpoints must independently verify workspace capability/entitlement and user role/resource permission.

## Boundary Guard

Run:

```bash
npm run check:plugin-boundaries
```

The guard blocks new direct imports from core-owned app surfaces into plugin UI implementation files. Existing direct route-shell imports are captured in `tools/plugin-ui-boundary-baseline.json` and should be removed as routes move behind declared plugin registries.

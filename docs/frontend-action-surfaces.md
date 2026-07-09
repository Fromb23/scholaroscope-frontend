# Frontend Action Surfaces

Scholaroscope is mobile-first. Any user action that can load, validate, block, fail, or succeed must keep that state in the active foreground UI the user is working in.

## Principle

Every user action needs an active foreground surface. Loading, validation, warning, blocked, progress, success, and error states for that action stay inside that surface until the user closes it or intentionally clears it.

Do not duplicate active action errors into page-level banners while a modal, sheet, row editor, or action panel is open.

## Page Banners

Use page-level `ErrorBanner` or `AppErrorBanner` for page-load and background context failures, such as:

- Initial page data failed to load.
- A passive readiness refresh failed while no action surface is open.
- A route-level permission or network state blocks the whole page.

Do not use page-level banners for submit, save, compute, prepare, or apply errors from an active modal, sheet, form footer, row editor, or action panel.

## Action Sheet State

Use `ResponsiveActionSheet` for foreground actions that need mobile bottom-sheet and desktop modal/panel behavior. Put action state inside it with:

- `ActionStateBanner` for info, warning, blocked, loading, success, and error messages.
- `ActionProgress` for long-running jobs.

Foreground action errors are persistent by default with `ActionStateBanner`. Avoid `autoDismissMs` for blocking form or action errors. When an action is actively saving or computing, pass `closeDisabled` or an equivalent local guard so backdrop, escape, and close buttons cannot drop the foreground state accidentally.

## Mobile Behavior

On mobile, `ResponsiveActionSheet` renders as a bottom sheet with:

- Dimmed scrim.
- Rounded top corners.
- Drag handle.
- Internal scroll.
- Sticky footer.
- Body scroll lock.

On desktop, the same component renders as a centered modal by default, or as a panel with `desktopMode="panel"`.

## Current Examples

- `/reports/compute`: `ComputeReportsSheet` owns queued, SSE progress, polling fallback, blocked, error, and success states for official report computation.
- `/reports/compute` and `/reports/policies/cbc`: `ReportPrepareTermSheet` owns term preparation, recommendations, conflicts, apply progress, and apply errors.
- `app/components/ui/Modal.tsx`: existing modal callers use the responsive action surface, preserving desktop behavior while becoming bottom sheets on mobile.
- `AssignmentCreateModal`: assignment form errors, policy guidance, practice-only warnings, disabled reasons, and save state remain in the modal sheet; the mobile footer keeps Cancel/Create visible.
- `/assessments/new`: critical create errors, policy guidance errors, all-components-created messages, and submit-disabled reasons render in the active form area and near the submit action.

## Guard

Run:

```bash
npm run check:error-placement
```

The guard keeps the existing duplicate-banner baseline and also checks the highest-value foreground action flows so active action state does not move back to page-level banners.

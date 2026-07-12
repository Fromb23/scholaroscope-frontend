# Runtime Boundary Test Plan

GAP-014 protects runtime transitions where static architecture checks are not enough.

Priority-0 coverage in this folder focuses on:

- tenant cache isolation during workspace switches
- late previous-workspace responses after a switch
- auth refresh races, failed refreshes, and local logout winning over refresh
- membership-version mismatch signaling for workspace context reload
- permission/capability revocation removing protected navigation
- suspended or removed active workspace blocking protected children
- plugin route safety while required plugins load or fail

These tests intentionally avoid styling, snapshots, broad page flows, and ordinary display components.

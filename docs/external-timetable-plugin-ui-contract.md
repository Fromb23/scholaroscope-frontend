# External Timetable Plugin UI Contract

Status: implemented route shell and projection UI for the external timetable
plugin.

## Boundary

The Scholaroscope frontend remains the customer-facing workspace application. Teachers view timetable projections inside Scholaroscope. Managers launch the independent temporal management portal only through a secure backend-issued launch action.

The frontend never decides plugin entitlement, installation, enablement, or authority from route files, raw roles, or workspace labels. It consumes backend capability and permission truth.

## Capability-controlled navigation

When the backend reports timetable capability and permission state:

- users with `timetable.view_own` see `My Timetable` in the teaching surface;
- users with `timetable.view_workspace` see workspace timetable projections in management surfaces;
- users with `timetable.manage` see the external management launch action;
- users without timetable authority see no timetable navigation or launch action;
- disabled plugin capability removes routes from navigation and backend APIs remain authoritative if a stale route is opened.

## Secure launch UI

The frontend calls Scholaroscope's launch endpoint and follows the returned safe POST/redirect action. It does not store long-lived temporal bearer tokens, plugin secrets, raw launch grants, or Scholaroscope internal tokens in client-side JavaScript storage.

The external temporal portal must display trusted workspace identity from the launch session. URL workspace parameters are not authority.

## Projection pages

Teacher projections:

- published own timetable;
- upcoming own changes;
- own examination/invigilation schedule where permitted;
- print view for a specific published version.

Manager projections:

- workspace published timetable;
- filters for teacher, cohort, subject, cohort-subject, room, day, and version;
- historical/published version selection where authorized;
- print view for the selected projection.

Print output includes workspace name, term, timetable type, effective date, version, filter subject, and generated timestamp.

## Error and stale-state handling

Timetable pages use the existing structured error presentation rules. Permission, entitlement, disabled-plugin, provisioning, stale-session, and integration-health failures render safe user-facing messages without exposing internal exception text.

Workspace-generation boundaries must prevent stale timetable responses from crossing active workspace changes.

## Implemented public routes

The timetable plugin registers these public routes through the plugin manifest
and route-access extension:

- `/timetable`
- `/timetable/my`
- `/timetable/my/print`
- `/timetable/workspace`
- `/timetable/workspace/print`

Route files render a plugin-owned route renderer rather than importing timetable
page components directly into core route shells. Runtime visibility and route
access are still enforced from backend capability and permission state; the
frontend checks exist only to select the appropriate user experience.

## Backend endpoint map

The implemented UI uses:

- `GET /api/plugins/timetable/integration/status/`
- `GET /api/plugins/timetable/projections/own/`
- `GET /api/plugins/timetable/projections/own/changes/`
- `GET /api/plugins/timetable/projections/own/print/`
- `GET /api/plugins/timetable/projections/workspace/`
- `GET /api/plugins/timetable/projections/workspace/print/`
- `POST /api/plugins/timetable/launch/`

The launch action posts the backend-issued single-use grant to the temporal
portal exchange endpoint and does not persist the grant or any installation
secret in browser storage.
